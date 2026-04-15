'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface Trade {
  id: string
  date: string
  name: string
  amount: number
  staked: number
  leverage: string
  open_price: number
  close_price: number
  pl_type: string
  pl_percentage: number
  amount_pl: number
  lg_st: string
  hint: string | null
  comments: string | null
  created_at: string
}

export interface MonthlySummary {
  month: string // "2025-01"
  label: string // "January 2025"
  totalTrades: number
  profits: number
  losses: number
  winRate: number
  totalPL: number
  totalAmountPL: number
  avgPLPercent: number
}

export interface YearlySummary {
  year: number
  totalTrades: number
  profits: number
  losses: number
  winRate: number
  totalPL: number
  totalAmountPL: number
  months: MonthlySummary[]
}

function computeMonthlySummary(trades: Trade[], month: string, label: string): MonthlySummary {
  const profits = trades.filter((t) => t.pl_type === 'P').length
  const losses = trades.filter((t) => t.pl_type === 'L').length
  const totalPL = trades.reduce((sum, t) => {
    const val = t.pl_type === 'P' ? Math.abs(t.amount_pl) : -Math.abs(t.amount_pl)
    return sum + val
  }, 0)
  const totalAmountPL = trades.reduce((sum, t) => {
    return sum + (t.pl_type === 'P' ? t.pl_percentage : -t.pl_percentage)
  }, 0)

  return {
    month,
    label,
    totalTrades: trades.length,
    profits,
    losses,
    winRate: trades.length > 0 ? (profits / trades.length) * 100 : 0,
    totalPL,
    totalAmountPL,
    avgPLPercent: trades.length > 0 ? totalAmountPL / trades.length : 0,
  }
}

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTrades = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('trades')
      .select('*')
      .order('date', { ascending: false })

    setTrades(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  const addTrade = async (trade: Omit<Trade, 'id' | 'created_at'>) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('trades').insert({
      ...trade,
      user_id: user.id,
    })

    if (error) return { error: error.message }

    await fetchTrades()
    return { error: null }
  }

  const removeTrade = async (id: string) => {
    const supabase = createClient()
    await supabase.from('trades').delete().eq('id', id)
    setTrades((prev) => prev.filter((t) => t.id !== id))
  }

  const getMonthlySummaries = useCallback((): MonthlySummary[] => {
    const grouped = new Map<string, Trade[]>()

    for (const trade of trades) {
      const key = trade.date.substring(0, 7) // "2025-01"
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(trade)
    }

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']

    return Array.from(grouped.entries())
      .map(([month, monthTrades]) => {
        const [y, m] = month.split('-')
        const label = `${months[parseInt(m) - 1]} ${y}`
        return computeMonthlySummary(monthTrades, month, label)
      })
      .sort((a, b) => b.month.localeCompare(a.month))
  }, [trades])

  const getYearlySummaries = useCallback((): YearlySummary[] => {
    const grouped = new Map<number, Trade[]>()

    for (const trade of trades) {
      const year = parseInt(trade.date.substring(0, 4))
      if (!grouped.has(year)) grouped.set(year, [])
      grouped.get(year)!.push(trade)
    }

    const monthlySummaries = getMonthlySummaries()

    return Array.from(grouped.entries())
      .map(([year, yearTrades]) => {
        const profits = yearTrades.filter((t) => t.pl_type === 'P').length
        const losses = yearTrades.filter((t) => t.pl_type === 'L').length
        const totalPL = yearTrades.reduce((sum, t) => {
          return sum + (t.pl_type === 'P' ? Math.abs(t.amount_pl) : -Math.abs(t.amount_pl))
        }, 0)
        const totalAmountPL = yearTrades.reduce((sum, t) => {
          return sum + (t.pl_type === 'P' ? t.pl_percentage : -t.pl_percentage)
        }, 0)

        return {
          year,
          totalTrades: yearTrades.length,
          profits,
          losses,
          winRate: yearTrades.length > 0 ? (profits / yearTrades.length) * 100 : 0,
          totalPL,
          totalAmountPL,
          months: monthlySummaries.filter((m) => m.month.startsWith(year.toString())),
        }
      })
      .sort((a, b) => b.year - a.year)
  }, [trades, getMonthlySummaries])

  return { trades, loading, addTrade, removeTrade, fetchTrades, getMonthlySummaries, getYearlySummaries }
}