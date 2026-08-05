'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface WatchlistItem {
  id: string
  coin_id: string
  coin_symbol: string
  coin_name: string
  source: string
  added_at: string
  comment: string | null
  starred: boolean
}

export interface Purchase {
  id: string
  coin_id: string
  coin_symbol: string
  coin_name: string
  quantity: number
  buy_price: number
  exchange: string
  purchased_at: string
  notes: string | null
  created_at: string
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('watchlist')
      .select('*')
      .order('added_at', { ascending: false })

    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const remove = async (id: string) => {
    const supabase = createClient()
    await supabase.from('watchlist').delete().eq('id', id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const toggleStar = async (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const supabase = createClient()
    await supabase.from('watchlist').update({ starred: !item.starred }).eq('id', id)
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, starred: !i.starred } : i))
  }

  return { items, loading, refetch: fetch, remove, toggleStar }
}

export function usePurchases() {
  const [items, setItems] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('purchases')
      .select('*')
      .order('purchased_at', { ascending: false })

    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const remove = async (id: string) => {
    const supabase = createClient()
    await supabase.from('purchases').delete().eq('id', id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return { items, loading, refetch: fetch, remove }
}