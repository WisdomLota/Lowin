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
  fee_amount: number
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

export type CurrencyCode = 'NGN' | 'USD' | 'TRY'

// Anything that isn't USD or TRY is treated as naira
export function currencyOf(currency: string): CurrencyCode {
  return currency === 'USD' || currency === 'TRY' ? currency : 'NGN'
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

  const addTransaction = async (tx: { investment_id: string; type: 'deposit' | 'withdrawal' | 'value_update'; amount: number; date: string; notes?: string | null; fee_amount?: number }) => {
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
    
    // Find the transaction to check for fee
    const tx = transactions.find((t) => t.id === id)
    if (tx && tx.fee_amount && tx.fee_amount > 0) {
      // Reverse the fee from the investment's processing_fee
      const inv = investments.find((i) => i.id === tx.investment_id)
      if (inv) {
      const newFee = Math.max(0, inv.processing_fee - tx.fee_amount)
        await supabase.from('investments').update({ processing_fee: newFee }).eq('id', inv.id)
      }
    }
    
    await supabase.from('investment_transactions').delete().eq('id', id)
    await fetchAll()
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

  // Monthly performance: per-investment earnings summed up (one currency at a time —
  // amounts in different currencies can't be added together).
  // Earnings are net of fees: a fee is cash paid in that never shows up in the value,
  // so it counts as a loss in the month it was charged.
  const getMonthlyPerformance = useCallback((filterType?: 'mutual_fund' | 'stock' | 'treasury_bill' | 'savings', currency?: 'NGN' | 'USD' | 'TRY') => {
    const allEnriched = getEnrichedInvestments()
    const enriched = allEnriched.filter((i) =>
      (!filterType || i.type === filterType) && (!currency || currencyOf(i.currency) === currency)
    )
    if (enriched.length === 0) return []

    const monthOf = (date: string) => date.substring(0, 7)
    const nextMonth = (key: string) => {
      const [y, m] = key.split('-').map(Number)
      return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
    }

    // Per-investment lookups
    const perInv = enriched.map((inv) => {
      const invTxs = transactions.filter((t) => t.investment_id === inv.id)
      // processing_fee also accumulates fees from transactions, so the buy-date fee is what's left over
      const txFeesTotal = invTxs.reduce((s, t) => s + (t.fee_amount || 0), 0)
      return {
        inv,
        invTxs,
        buyMonth: monthOf(inv.buy_date),
        initialFee: Math.max(0, inv.processing_fee - txFeesTotal),
      }
    })

    // Every month from the first event to the last, so months without updates aren't skipped
    const eventMonths: string[] = []
    for (const { inv, invTxs } of perInv) {
      eventMonths.push(monthOf(inv.buy_date))
      for (const t of invTxs) eventMonths.push(monthOf(t.date))
    }
    eventMonths.sort()
    const sortedMonths: string[] = []
    for (let m = eventMonths[0]; m <= eventMonths[eventMonths.length - 1]; m = nextMonth(m)) {
      sortedMonths.push(m)
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']

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

    // Each investment's value at the end of the previous month
    const prevEnd = new Map<string, number>()

    for (const monthKey of sortedMonths) {
      let totalEarning = 0
      let totalValueThisMonth = 0
      let totalValuePrevMonth = 0
      let totalDeposits = 0
      let totalWithdrawals = 0
      let totalFees = 0

      for (const { inv, invTxs, buyMonth, initialFee } of perInv) {
        if (buyMonth > monthKey) continue // not held yet

        const inMonth = invTxs.filter((t) => monthOf(t.date) === monthKey)
        const deposits = inMonth.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)
          + (buyMonth === monthKey ? inv.amount : 0)
        const withdrawals = inMonth.filter((t) => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0)
        const fees = inMonth.reduce((s, t) => s + (t.fee_amount || 0), 0)
          + (buyMonth === monthKey ? initialFee : 0)

        const update = inMonth
          .filter((t) => t.type === 'value_update')
          .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))[0]

        const prev = prevEnd.get(inv.id) ?? 0
        let end: number
        let earning: number
        if (update) {
          end = update.amount
          // growth only: what it's worth now, minus what it was worth plus what was put in, minus fees paid
          earning = end - (prev + deposits - withdrawals) - fees
        } else {
          // No update this month: value moves only with cash flows, the only loss is fees
          end = Math.max(0, prev + deposits - withdrawals)
          earning = -fees
        }

        prevEnd.set(inv.id, end)
        totalEarning += earning
        totalValueThisMonth += end
        totalValuePrevMonth += prev
        totalDeposits += deposits
        totalWithdrawals += withdrawals
        totalFees += fees
      }

      // Earning percentage: relative to what was in the portfolio at start plus what was added
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
      const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365

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
          // No value_update before this year — use amount held (fees are a cost, not part of the holding)
          startValue = inv.amount
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
          // Account for deposits/withdrawals AFTER the last value_update
          const lastUpdate = yearUpdates[0]
          const isAfterUpdate = (t: InvestmentTransaction) =>
            t.date > lastUpdate.date || (t.date === lastUpdate.date && t.created_at > lastUpdate.created_at)
          const postUpdateDeposits = invTxs.filter((t) => t.type === 'deposit' && t.date <= yearEnd && isAfterUpdate(t)).reduce((s, t) => s + t.amount, 0)
          const postUpdateWithdrawals = invTxs.filter((t) => t.type === 'withdrawal' && t.date <= yearEnd && isAfterUpdate(t)).reduce((s, t) => s + t.amount, 0)
          endValue += postUpdateDeposits - postUpdateWithdrawals
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
            // No value update — amount held including all deposits/withdrawals this year (fees are not part of the holding)
            endValue = inv.amount
            endValue += invTxs.filter((t) => t.type === 'deposit' && t.date >= yearStart && t.date <= yearEnd).reduce((s, t) => s + t.amount, 0)
            endValue -= invTxs.filter((t) => t.type === 'withdrawal' && t.date >= yearStart && t.date <= yearEnd).reduce((s, t) => s + t.amount, 0)
          }
          hasData = true
        }

        totalStartValue += startValue
        totalEndValue += endValue

        // Cashflows this year (deposits, withdrawals, initial investment, fees)
        const yearCashflows: { amount: number; date: string }[] = []

        // processing_fee also accumulates fees from transactions, so the buy-date fee is what's left over
        const txFeesTotal = invTxs.reduce((s, t) => s + (t.fee_amount || 0), 0)
        const initialFee = Math.max(0, inv.processing_fee - txFeesTotal)

        // Initial investment if bought this year — fee is paid on top, so it's a cost
        if (inv.buy_date >= yearStart && inv.buy_date <= yearEnd) {
          yearCashflows.push({ amount: inv.amount + initialFee, date: inv.buy_date })
          totalDeposits += inv.amount
          totalFees += initialFee
        }

        // Deposits this year
        for (const tx of invTxs) {
          // Fees charged on transactions are also paid on top
          if (tx.fee_amount > 0 && tx.date >= yearStart && tx.date <= yearEnd) {
            yearCashflows.push({ amount: tx.fee_amount, date: tx.date })
            totalFees += tx.fee_amount
          }
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

      // Modified Dietz formula (returns are net of fees):
      // Return = (End - Start - Net Cashflow) / (Start + Weighted Cashflow)
      // Fees are cash paid in but never show up in the value, so they count as a loss
      const netCashflow = totalDeposits - totalWithdrawals + totalFees
      const totalEarning = totalEndValue - totalStartValue - netCashflow
      const denominator = totalStartValue + weightedCashflow

      let twr = 0
      // If no start value (all new investments this year), use simple return
      const effectiveBase = totalStartValue > 0 ? denominator : (totalDeposits + totalFees)
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