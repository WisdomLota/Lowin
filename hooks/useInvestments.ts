'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface Investment {
  id: string
  type: 'mutual_fund' | 'stock' | 'treasury_bill' | 'savings'
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
  const getPlatformGroups = useCallback((type: 'mutual_fund' | 'stock' | 'treasury_bill' | 'savings'): PlatformGroup[] => {
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

  // Monthly performance: per-investment earnings summed up
  const getMonthlyPerformance = useCallback((filterType?: 'mutual_fund' | 'stock' | 'treasury_bill' | 'savings') => {
    const allEnriched = getEnrichedInvestments()
    const enriched = filterType ? allEnriched.filter((i) => i.type === filterType) : allEnriched
    if (enriched.length === 0) return []

    const monthsWithUpdates = new Set<string>()
    for (const tx of transactions) {
      if (tx.type === 'value_update') {
        monthsWithUpdates.add(tx.date.substring(0, 7))
      }
    }

    const sortedMonths = Array.from(monthsWithUpdates).sort()
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']

    // For each investment, get its value as of a given month
    function getInvValueAsOfMonth(inv: typeof enriched[number], monthKey: string): number | null {
      const invTxs = transactions.filter((t) => t.investment_id === inv.id)
      const updates = invTxs
        .filter((t) => t.type === 'value_update' && t.date.substring(0, 7) <= monthKey)
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
      return updates.length > 0 ? updates[0].amount : null
    }

    // For each investment, get total money put in as of a given month
    function getInvCostBasis(inv: typeof enriched[number], monthKey: string): number {
      const invTxs = transactions.filter((t) => t.investment_id === inv.id)
      let basis = 0
      if (inv.buy_date.substring(0, 7) <= monthKey) {
        basis += inv.amount
        basis += inv.processing_fee
      }
      basis += invTxs.filter((t) => t.type === 'deposit' && t.date.substring(0, 7) <= monthKey).reduce((s, t) => s + t.amount, 0)
      basis -= invTxs.filter((t) => t.type === 'withdrawal' && t.date.substring(0, 7) <= monthKey).reduce((s, t) => s + t.amount, 0)
      return basis
    }

    const monthlySummaries: {
      month: string
      label: string
      totalValue: number
      prevValue: number
      monthEarning: number
      deposits: number
      withdrawals: number
      fees: number
      earningPct: number
    }[] = []

    for (let i = 0; i < sortedMonths.length; i++) {
      const monthKey = sortedMonths[i]
      const prevMonthKey = i > 0 ? sortedMonths[i - 1] : null

      let totalEarning = 0
      let totalValueThisMonth = 0
      let totalValuePrevMonth = 0
      let totalDeposits = 0
      let totalWithdrawals = 0
      let totalFees = 0

      for (const inv of enriched) {
        const invTxs = transactions.filter((t) => t.investment_id === inv.id)

        // This month's cash flows for this investment
        const monthDeposits = invTxs.filter((t) => t.type === 'deposit' && t.date.substring(0, 7) === monthKey).reduce((s, t) => s + t.amount, 0)
          + (inv.buy_date.substring(0, 7) === monthKey ? inv.amount : 0)
        const monthWithdrawals = invTxs.filter((t) => t.type === 'withdrawal' && t.date.substring(0, 7) === monthKey).reduce((s, t) => s + t.amount, 0)
        const monthFees = inv.buy_date.substring(0, 7) === monthKey ? inv.processing_fee : 0

        // Always count deposits/withdrawals for display
        totalDeposits += monthDeposits
        totalWithdrawals += monthWithdrawals
        totalFees += monthFees

        const thisMonthValue = getInvValueAsOfMonth(inv, monthKey)

        if (thisMonthValue === null) {
          // No value update yet — this investment contributes ₦0 earning
          // but count it at cost basis for total value display
          if (inv.buy_date.substring(0, 7) <= monthKey) {
            const costBasis = getInvCostBasis(inv, monthKey)
            totalValueThisMonth += costBasis
          }
          continue
        }

        totalValueThisMonth += thisMonthValue

        // Get previous month's value for this specific investment
        let prevValue: number
        if (prevMonthKey) {
          const prevMonthValue = getInvValueAsOfMonth(inv, prevMonthKey)
          if (prevMonthValue !== null) {
            prevValue = prevMonthValue
          } else {
            // First value_update for this investment is in this month
            // Use cost basis as starting point (what was invested BEFORE this month)
            let basis = 0
            if (inv.buy_date.substring(0, 7) < monthKey) {
              basis += inv.amount + inv.processing_fee
              basis += invTxs.filter((t) => t.type === 'deposit' && t.date.substring(0, 7) < monthKey).reduce((s, t) => s + t.amount, 0)
              basis -= invTxs.filter((t) => t.type === 'withdrawal' && t.date.substring(0, 7) < monthKey).reduce((s, t) => s + t.amount, 0)
            }
            prevValue = basis
          }
        } else {
          // First month ever — use cost basis before this month
          let basis = 0
          if (inv.buy_date.substring(0, 7) < monthKey) {
            basis += inv.amount + inv.processing_fee
            basis += invTxs.filter((t) => t.type === 'deposit' && t.date.substring(0, 7) < monthKey).reduce((s, t) => s + t.amount, 0)
            basis -= invTxs.filter((t) => t.type === 'withdrawal' && t.date.substring(0, 7) < monthKey).reduce((s, t) => s + t.amount, 0)
          } else if (inv.buy_date.substring(0, 7) === monthKey) {
            basis = 0 // brand new this month, no prior value
          }
          prevValue = basis
        }

        totalValuePrevMonth += prevValue

        // Per-investment earning: growth only
        const invEarning = thisMonthValue - prevValue - monthDeposits + monthWithdrawals
        totalEarning += invEarning
      }

      // Earning percentage: relative to what was in the portfolio at start
      const base = totalValuePrevMonth + totalDeposits
      const earningPct = base > 0 ? (totalEarning / base) * 100 : 0

      const [y, m] = monthKey.split('-')

      monthlySummaries.push({
        month: monthKey,
        label: `${monthNames[parseInt(m) - 1]} ${y}`,
        totalValue: totalValueThisMonth,
        prevValue: totalValuePrevMonth,
        monthEarning: totalEarning,
        deposits: totalDeposits,
        withdrawals: totalWithdrawals,
        fees: totalFees,
        earningPct,
      })
    }

    return monthlySummaries
  }, [transactions, getEnrichedInvestments])

  // Yearly returns using Modified Dietz method (deposit/withdrawal adjusted)
  const getYearlyReturns = useCallback((investmentIds?: string[]) => {
    const enriched = getEnrichedInvestments()
    const filtered = investmentIds ? enriched.filter((i) => investmentIds.includes(i.id)) : enriched
    if (filtered.length === 0) return []

    // Collect all years
    const years = new Set<number>()
    for (const inv of filtered) {
      years.add(parseInt(inv.buy_date.substring(0, 4)))
      for (const tx of inv.transactions) {
        years.add(parseInt(tx.date.substring(0, 4)))
      }
    }

    const sortedYears = Array.from(years).sort()
    const results: {
      year: number
      twr: number
      totalEarning: number
      startValue: number
      endValue: number
      totalDeposits: number
      totalWithdrawals: number
      totalFees: number
    }[] = []

    for (const year of sortedYears) {
      const yearStart = `${year}-01-01`
      const yearEnd = `${year}-12-31`
      const daysInYear = (year % 4 === 0) ? 366 : 365

      let totalStartValue = 0
      let totalEndValue = 0
      let totalDeposits = 0
      let totalWithdrawals = 0
      let totalFees = 0
      let weightedCashflow = 0
      let hasData = false

      for (const inv of filtered) {
        const invTxs = transactions.filter((t) => t.investment_id === inv.id)

        // Get START value for this year
        let startValue = 0
        const preYearUpdates = invTxs
          .filter((t) => t.type === 'value_update' && t.date < yearStart)
          .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

        if (preYearUpdates.length > 0) {
          startValue = preYearUpdates[0].amount
        } else if (inv.buy_date < yearStart) {
          // No value_update before this year — use cost basis
          startValue = inv.amount - inv.processing_fee
          startValue += invTxs.filter((t) => t.type === 'deposit' && t.date < yearStart).reduce((s, t) => s + t.amount, 0)
          startValue -= invTxs.filter((t) => t.type === 'withdrawal' && t.date < yearStart).reduce((s, t) => s + t.amount, 0)
        }

        // Get END value for this year
        let endValue = 0
        const yearUpdates = invTxs
          .filter((t) => t.type === 'value_update' && t.date >= yearStart && t.date <= yearEnd)
          .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

        if (yearUpdates.length > 0) {
          endValue = yearUpdates[0].amount
          hasData = true
        } else if (startValue > 0) {
          // No updates this year — carry forward
          endValue = startValue
          const yearDeposits = invTxs.filter((t) => t.type === 'deposit' && t.date >= yearStart && t.date <= yearEnd).reduce((s, t) => s + t.amount, 0)
          const yearWithdrawals = invTxs.filter((t) => t.type === 'withdrawal' && t.date >= yearStart && t.date <= yearEnd).reduce((s, t) => s + t.amount, 0)
          endValue += yearDeposits - yearWithdrawals
          if (yearDeposits > 0 || yearWithdrawals > 0) hasData = true
        } else if (inv.buy_date >= yearStart && inv.buy_date <= yearEnd) {
          // Investment started this year
          if (yearUpdates.length > 0) {
            endValue = yearUpdates[0].amount
          } else {
            // No value update — use cost basis including all deposits/withdrawals this year
            endValue = inv.amount - inv.processing_fee
            endValue += invTxs.filter((t) => t.type === 'deposit' && t.date >= yearStart && t.date <= yearEnd).reduce((s, t) => s + t.amount, 0)
            endValue -= invTxs.filter((t) => t.type === 'withdrawal' && t.date >= yearStart && t.date <= yearEnd).reduce((s, t) => s + t.amount, 0)
          }
          hasData = true
        }

        totalStartValue += startValue
        totalEndValue += endValue

        // Cashflows this year (deposits, withdrawals, initial investment, fees)
        const yearCashflows: { amount: number; date: string }[] = []

        // Initial investment if bought this year
        if (inv.buy_date >= yearStart && inv.buy_date <= yearEnd) {
          const netInitial = inv.amount - inv.processing_fee
          yearCashflows.push({ amount: netInitial, date: inv.buy_date })
          totalDeposits += inv.amount
          totalFees += inv.processing_fee
        }

        // Deposits this year
        for (const tx of invTxs) {
          if (tx.type === 'deposit' && tx.date >= yearStart && tx.date <= yearEnd) {
            yearCashflows.push({ amount: tx.amount, date: tx.date })
            totalDeposits += tx.amount
          }
          if (tx.type === 'withdrawal' && tx.date >= yearStart && tx.date <= yearEnd) {
            yearCashflows.push({ amount: -tx.amount, date: tx.date })
            totalWithdrawals += tx.amount
          }
        }

        // Weight each cashflow by time remaining in year
        for (const cf of yearCashflows) {
          const cfDate = new Date(cf.date)
          const janFirst = new Date(`${year}-01-01`)
          const dayOfYear = Math.floor((cfDate.getTime() - janFirst.getTime()) / (1000 * 60 * 60 * 24))
          const weight = (daysInYear - dayOfYear) / daysInYear
          weightedCashflow += cf.amount * weight
        }
      }

      if (!hasData) continue

      // Modified Dietz formula:
      // Return = (End - Start - Net Cashflow) / (Start + Weighted Cashflow)
      const netCashflow = totalDeposits - totalWithdrawals - totalFees
      const totalEarning = totalEndValue - totalStartValue - netCashflow
      const denominator = totalStartValue + weightedCashflow

      let twr = 0
      // If no start value (all new investments this year), use simple return
      const effectiveBase = totalStartValue > 0 ? denominator : (totalDeposits - totalFees)
      if (effectiveBase > 0) {
        twr = (totalEarning / effectiveBase) * 100
      } else if (totalEarning > 0) {
        twr = 100 // started from zero, made money
      }

      results.push({
        year,
        twr,
        totalEarning,
        startValue: totalStartValue,
        endValue: totalEndValue,
        totalDeposits,
        totalWithdrawals,
        totalFees,
      })
    }

    return results
  }, [transactions, getEnrichedInvestments])

  return {
    investments, transactions, loading,
    addInvestment, removeInvestment,
    addTransaction, removeTransaction,
    getEnrichedInvestments, getPlatformGroups, getMonthlyPerformance, getYearlyReturns, fetchAll,
  }
}