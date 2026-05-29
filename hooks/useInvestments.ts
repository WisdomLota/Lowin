'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface Investment {
  id: string
  type: 'mutual_fund' | 'stock'
  title: string
  platform: string
  amount: number
  currency: string
  unit_price: number | null
  units: number | null
  expected_return_pct: number
  processing_fee: number
  buy_date: string
  sell_date: string | null
  sell_amount: number | null
  notes: string | null
  created_at: string
}

export interface InvestmentTransaction {
  id: string
  investment_id: string
  type: 'deposit' | 'withdrawal' | 'value_update'
  amount: number
  date: string
  notes: string | null
  created_at: string
}

export interface PlatformGroup {
  platform: string
  investments: InvestmentWithData[]
  totalInvested: number
  totalFees: number
  totalWithdrawn: number
  currentValue: number
  netPL: number
}

export interface InvestmentWithData extends Investment {
  transactions: InvestmentTransaction[]
  totalDeposited: number
  totalWithdrawn: number
  currentValue: number
  netPL: number
}

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    const [invRes, txRes] = await Promise.all([
      supabase.from('investments').select('*').order('buy_date', { ascending: false }),
      supabase.from('investment_transactions').select('*').order('date', { ascending: false }),
    ])
    setInvestments(invRes.data || [])
    setTransactions(txRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addInvestment = async (inv: Omit<Investment, 'id' | 'created_at'>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('investments').insert({ ...inv, user_id: user.id })
    if (error) return { error: error.message }
    await fetchAll()
    return { error: null }
  }

  const removeInvestment = async (id: string) => {
    const supabase = createClient()
    await supabase.from('investments').delete().eq('id', id)
    setInvestments((prev) => prev.filter((i) => i.id !== id))
    setTransactions((prev) => prev.filter((t) => t.investment_id !== id))
  }

  const addTransaction = async (tx: { investment_id: string; type: string; amount: number; date: string; notes?: string }) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('investment_transactions').insert({ ...tx, user_id: user.id })
    if (error) return { error: error.message }
    await fetchAll()
    return { error: null }
  }

  const removeTransaction = async (id: string) => {
    const supabase = createClient()
    await supabase.from('investment_transactions').delete().eq('id', id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  // Enrich investments with computed data
  const getEnrichedInvestments = useCallback((): InvestmentWithData[] => {
    return investments.map((inv) => {
      const invTxs = transactions.filter((t) => t.investment_id === inv.id)
      const deposits = invTxs.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)
      const withdrawals = invTxs.filter((t) => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0)

      // Current value logic:
      // 1. Start with latest value_update if available, else use initial amount + deposits
      // 2. Subtract any withdrawals that happened AFTER the latest value_update
      const valueUpdates = invTxs
        .filter((t) => t.type === 'value_update')
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

      let currentValue: number
      if (valueUpdates.length > 0) {
        const latestUpdate = valueUpdates[0]
        currentValue = latestUpdate.amount
        // Subtract withdrawals that happened after or on the same date as the last value update
        const withdrawalsAfterUpdate = invTxs.filter(
          (t) => t.type === 'withdrawal' && (t.date > latestUpdate.date || (t.date === latestUpdate.date && t.created_at > latestUpdate.created_at))
        )
        currentValue -= withdrawalsAfterUpdate.reduce((s, t) => s + t.amount, 0)
      } else {
        // No value updates yet — current value is what was put in minus what was taken out
        currentValue = inv.amount + deposits - withdrawals
      }

      // Ensure current value doesn't go negative
      if (currentValue < 0) currentValue = 0

      const totalInvested = inv.amount + deposits
      // Net P/L = what you have now + what you've already taken out - what you put in - fees
      const netPL = currentValue + withdrawals - totalInvested - inv.processing_fee

      return {
        ...inv,
        transactions: invTxs,
        totalDeposited: totalInvested,
        totalWithdrawn: withdrawals,
        currentValue,
        netPL,
      }
    })
  }, [investments, transactions])

  // Group by platform
  const getPlatformGroups = useCallback((type: 'mutual_fund' | 'stock'): PlatformGroup[] => {
    const enriched = getEnrichedInvestments().filter((i) => i.type === type)
    const grouped = new Map<string, InvestmentWithData[]>()

    for (const inv of enriched) {
      if (!grouped.has(inv.platform)) grouped.set(inv.platform, [])
      grouped.get(inv.platform)!.push(inv)
    }

    return Array.from(grouped.entries()).map(([platform, invs]) => ({
      platform,
      investments: invs,
      totalInvested: invs.reduce((s, i) => s + i.totalDeposited, 0),
      totalFees: invs.reduce((s, i) => s + i.processing_fee, 0),
      totalWithdrawn: invs.reduce((s, i) => s + i.totalWithdrawn, 0),
      currentValue: invs.reduce((s, i) => s + i.currentValue, 0),
      netPL: invs.reduce((s, i) => s + i.netPL, 0),
    }))
  }, [getEnrichedInvestments])

  // Monthly performance: compare portfolio value snapshots month-to-month
  const getMonthlyPerformance = useCallback(() => {
    const enriched = getEnrichedInvestments()
    if (enriched.length === 0) return []

    // Collect all months that have any value_update
    const monthsWithUpdates = new Set<string>()
    for (const tx of transactions) {
      if (tx.type === 'value_update') {
        monthsWithUpdates.add(tx.date.substring(0, 7))
      }
    }

    const sortedMonths = Array.from(monthsWithUpdates).sort()
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']

    const monthlySummaries: { month: string; label: string; totalValue: number; totalInvested: number; totalFees: number; totalWithdrawn: number; netPL: number; plPct: number }[] = []

    for (const monthKey of sortedMonths) {
      let monthTotalValue = 0
      let monthTotalInvested = 0
      let monthTotalFees = 0
      let monthTotalWithdrawn = 0

      for (const inv of enriched) {
        const invTxs = transactions.filter((t) => t.investment_id === inv.id)

        // Find the latest value_update for this investment ON OR BEFORE this month
        const relevantUpdates = invTxs
          .filter((t) => t.type === 'value_update' && t.date.substring(0, 7) <= monthKey)
          .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

        if (relevantUpdates.length > 0) {
          monthTotalValue += relevantUpdates[0].amount
        } else {
          // No value update yet for this investment — use invested amount minus withdrawals
          const deposits = invTxs.filter((t) => t.type === 'deposit' && t.date.substring(0, 7) <= monthKey).reduce((s, t) => s + t.amount, 0)
          const withdrawals = invTxs.filter((t) => t.type === 'withdrawal' && t.date.substring(0, 7) <= monthKey).reduce((s, t) => s + t.amount, 0)
          monthTotalValue += inv.amount + deposits - withdrawals
        }

        // Calculate invested/fees/withdrawn up to this month
        const depositsToDate = invTxs.filter((t) => t.type === 'deposit' && t.date.substring(0, 7) <= monthKey).reduce((s, t) => s + t.amount, 0)
        const withdrawalsToDate = invTxs.filter((t) => t.type === 'withdrawal' && t.date.substring(0, 7) <= monthKey).reduce((s, t) => s + t.amount, 0)
        monthTotalInvested += inv.amount + depositsToDate
        monthTotalFees += inv.processing_fee
        monthTotalWithdrawn += withdrawalsToDate
      }

      const netPL = monthTotalValue + monthTotalWithdrawn - monthTotalInvested - monthTotalFees
      const plPct = monthTotalInvested > 0 ? (netPL / monthTotalInvested) * 100 : 0
      const [y, m] = monthKey.split('-')

      monthlySummaries.push({
        month: monthKey,
        label: `${monthNames[parseInt(m) - 1]} ${y}`,
        totalValue: monthTotalValue,
        totalInvested: monthTotalInvested,
        totalFees: monthTotalFees,
        totalWithdrawn: monthTotalWithdrawn,
        netPL,
        plPct,
      })
    }

    return monthlySummaries
  }, [transactions, getEnrichedInvestments])

  return {
    investments, transactions, loading,
    addInvestment, removeInvestment,
    addTransaction, removeTransaction,
    getEnrichedInvestments, getPlatformGroups, getMonthlyPerformance, fetchAll,
  }
}