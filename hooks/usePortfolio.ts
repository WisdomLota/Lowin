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

  return { items, loading, refetch: fetch, remove }
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