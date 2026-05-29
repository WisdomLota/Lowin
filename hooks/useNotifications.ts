'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export interface Notification {
  id: string
  type: 'delisting' | 'price_alert' | 'system'
  title: string
  message: string
  coin_symbol: string | null
  read: boolean
  created_at: string
}

export interface PriceAlert {
  id: string
  coin_id: string
  coin_symbol: string
  coin_name: string
  direction: 'above' | 'below'
  target_price: number
  triggered: boolean
  created_at: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    const [notifRes, alertRes] = await Promise.all([
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('price_alerts').select('*').order('created_at', { ascending: false }),
    ])
    setNotifications(notifRes.data || [])
    setPriceAlerts(alertRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const clearNotification = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const addPriceAlert = async (alert: { coin_id: string; coin_symbol: string; coin_name: string; direction: 'above' | 'below'; target_price: number }) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('price_alerts').insert({ ...alert, user_id: user.id })
    if (error) return { error: error.message }
    await fetchAll()
    return { error: null }
  }

  const removePriceAlert = async (id: string) => {
    const supabase = createClient()
    await supabase.from('price_alerts').delete().eq('id', id)
    setPriceAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  // Check watchlist coins against live data — detect delistings
  // Track which symbols we've already checked this session to prevent duplicates
  const checkedSymbolsRef = useRef(new Set<string>())

  const checkDelistings = useCallback(async (liveSymbols: Set<string>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [watchlistRes, purchasesRes] = await Promise.all([
      supabase.from('watchlist').select('coin_symbol, coin_name').eq('user_id', user.id),
      supabase.from('purchases').select('coin_symbol, coin_name').eq('user_id', user.id),
    ])

    const trackedCoins = new Map<string, string>()
    for (const item of watchlistRes.data || []) {
      trackedCoins.set(item.coin_symbol, item.coin_name)
    }
    for (const item of purchasesRes.data || []) {
      trackedCoins.set(item.coin_symbol, item.coin_name)
    }

    let newNotifications = false

    for (const [symbol, name] of trackedCoins) {
      if (!liveSymbols.has(symbol) && !checkedSymbolsRef.current.has(symbol)) {
        checkedSymbolsRef.current.add(symbol)

        // Check if we already have ANY delisting notification for this symbol
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('coin_symbol', symbol)
          .eq('type', 'delisting')
          .limit(1)
          .maybeSingle()

        if (!existing) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'delisting',
            title: `${symbol} may be delisted`,
            message: `${name} (${symbol}) is no longer appearing in exchange data. Check Bybit/CoinGecko for status. If you have funds in this coin, consider acting immediately.`,
            coin_symbol: symbol,
          })
          newNotifications = true
        }
      }
    }

    if (newNotifications) await fetchAll()
  }, [fetchAll])

  // Check price alerts against live data
  const checkPriceAlerts = useCallback(async (priceMap: Map<string, number>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const activeAlerts = priceAlerts.filter((a) => !a.triggered)

    for (const alert of activeAlerts) {
      const currentPrice = priceMap.get(alert.coin_symbol)
      if (currentPrice === undefined) continue

      const triggered =
        (alert.direction === 'above' && currentPrice >= alert.target_price) ||
        (alert.direction === 'below' && currentPrice <= alert.target_price)

      if (triggered) {
        // Mark alert as triggered
        await supabase.from('price_alerts').update({ triggered: true }).eq('id', alert.id)

        // Create notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'price_alert',
          title: `${alert.coin_symbol} hit $${alert.target_price}`,
          message: `${alert.coin_name} (${alert.coin_symbol}) has gone ${alert.direction} $${alert.target_price}. Current price: $${currentPrice}`,
          coin_symbol: alert.coin_symbol,
        })
      }
    }

    await fetchAll()
  }, [priceAlerts, fetchAll])

  // Check for pre-delisting warning signs (very low volume or near-zero price)
  const checkDelistingWarnings = useCallback(async (coinData: Map<string, { price: number; volume: number; symbol: string; name: string }>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [watchlistRes, purchasesRes] = await Promise.all([
      supabase.from('watchlist').select('coin_symbol').eq('user_id', user.id),
      supabase.from('purchases').select('coin_symbol').eq('user_id', user.id),
    ])

    const trackedSymbols = new Set<string>()
    for (const item of watchlistRes.data || []) trackedSymbols.add(item.coin_symbol)
    for (const item of purchasesRes.data || []) trackedSymbols.add(item.coin_symbol)

    let newNotifications = false

    for (const symbol of trackedSymbols) {
      const data = coinData.get(symbol)
      if (!data) continue

      const isLowVolume = data.volume < 10000 && data.volume > 0
      if (!isLowVolume) continue

      // Check if we already warned about this coin
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('coin_symbol', symbol)
        .eq('type', 'system')
        .ilike('title', `%${symbol}%low volume%`)
        .limit(1)
        .maybeSingle()

      if (!existing) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'system',
          title: `${symbol} — critically low volume`,
          message: `${data.name} (${symbol}) has only $${data.volume.toFixed(2)} in 24h trading volume. This is often a sign of impending delisting. Consider exiting your position if you hold any.`,
          coin_symbol: symbol,
        })
        newNotifications = true
      }
    }

    if (newNotifications) await fetchAll()
  }, [fetchAll])

  return {
    notifications, priceAlerts, unreadCount, loading,
    markAsRead, markAllAsRead, clearNotification,
    addPriceAlert, removePriceAlert,
    checkDelistings, checkPriceAlerts, checkDelistingWarnings, fetchAll,
  }
}