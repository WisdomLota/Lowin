'use client'

import { useState, useMemo } from 'react'
import { useInvestments, InvestmentWithData } from '@/hooks/useInvestments'
import { Header } from '@/components/layout/header'
import { AddInvestmentModal } from '@/components/investments/add-investment-modal'
import { TransactionModal } from '@/components/investments/transaction-modal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type InvTab = 'mutual_fund' | 'stock' | 'treasury_bill' | 'savings'

function formatCurrency(amount: number, currency: string = 'NGN'): string {
  const symbol = currency === 'USD' ? '$' : '₦'
  return `${symbol}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function InvestmentsPage() {
  const {
    investments, loading, addInvestment, removeInvestment,
    addTransaction, removeTransaction,
    getPlatformGroups, getMonthlyPerformance, getEnrichedInvestments, getYearlyReturns,
  } = useInvestments()

  const [activeTab, setActiveTab] = useState<InvTab>('mutual_fund')
  const [addOpen, setAddOpen] = useState(false)
  const [txTarget, setTxTarget] = useState<{ id: string; title: string; type: 'deposit' | 'withdrawal' | 'value_update' } | null>(null)
  const [expandedInv, setExpandedInv] = useState<string | null>(null)

  const allPlatformGroups = useMemo(() => getPlatformGroups(activeTab), [getPlatformGroups, activeTab])

  const [showAllTxForInv, setShowAllTxForInv] = useState<string | null>(null)
  const [yearlyReturnsTarget, setYearlyReturnsTarget] = useState<{ title: string; ids?: string[] } | null>(null)

  // Separate by currency
  const ngnGroups = useMemo(() => allPlatformGroups.map((g) => ({
    ...g,
    investments: g.investments.filter((i) => i.currency !== 'USD'),
  })).filter((g) => g.investments.length > 0).map((g) => ({
    ...g,
    totalInvested: g.investments.reduce((s, i) => s + i.totalDeposited, 0),
    totalFees: g.investments.reduce((s, i) => s + i.processing_fee, 0),
    totalWithdrawn: g.investments.reduce((s, i) => s + i.totalWithdrawn, 0),
    currentValue: g.investments.reduce((s, i) => s + i.currentValue, 0),
    netPL: g.investments.reduce((s, i) => s + i.netPL, 0),
  })), [allPlatformGroups])
  
  const usdGroups = useMemo(() => allPlatformGroups.map((g) => ({
    ...g,
    investments: g.investments.filter((i) => i.currency === 'USD'),
  })).filter((g) => g.investments.length > 0).map((g) => ({
    ...g,
    totalInvested: g.investments.reduce((s, i) => s + i.totalDeposited, 0),
    totalFees: g.investments.reduce((s, i) => s + i.processing_fee, 0),
    totalWithdrawn: g.investments.reduce((s, i) => s + i.totalWithdrawn, 0),
    currentValue: g.investments.reduce((s, i) => s + i.currentValue, 0),
    netPL: g.investments.reduce((s, i) => s + i.netPL, 0),
  })), [allPlatformGroups])

  // Overall summary
  const summary = useMemo(() => {
    const ngnSummary = {
      totalInvested: ngnGroups.reduce((s, g) => s + g.totalInvested, 0),
      totalFees: ngnGroups.reduce((s, g) => s + g.totalFees, 0),
      totalWithdrawn: ngnGroups.reduce((s, g) => s + g.totalWithdrawn, 0),
      currentValue: ngnGroups.reduce((s, g) => s + g.currentValue, 0),
      netPL: ngnGroups.reduce((s, g) => s + g.netPL, 0),
    }
    const usdSummary = {
      totalInvested: usdGroups.reduce((s, g) => s + g.totalInvested, 0),
      totalFees: usdGroups.reduce((s, g) => s + g.totalFees, 0),
      totalWithdrawn: usdGroups.reduce((s, g) => s + g.totalWithdrawn, 0),
      currentValue: usdGroups.reduce((s, g) => s + g.currentValue, 0),
      netPL: usdGroups.reduce((s, g) => s + g.netPL, 0),
    }
    return { ngn: ngnSummary, usd: usdSummary }
  }, [ngnGroups, usdGroups])

  const monthlyPerformanceForTab = useMemo(() => getMonthlyPerformance(activeTab), [getMonthlyPerformance, activeTab])
  const monthlyPerformanceCombined = useMemo(() => getMonthlyPerformance(), [getMonthlyPerformance])
  const enrichedInvestments = useMemo(() => getEnrichedInvestments(), [getEnrichedInvestments])
  // Total portfolio across ALL investment types (not just active tab)
  const totalPortfolio = useMemo(() => {
    const all = getEnrichedInvestments()
    const ngn = all.filter((i) => i.currency !== 'USD')
    const usd = all.filter((i) => i.currency === 'USD')
    return {
      ngn: {
        invested: ngn.reduce((s, i) => s + i.totalDeposited, 0),
        currentValue: ngn.reduce((s, i) => s + i.currentValue, 0),
        netPL: ngn.reduce((s, i) => s + i.netPL, 0),
        fees: ngn.reduce((s, i) => s + i.processing_fee, 0),
        withdrawn: ngn.reduce((s, i) => s + i.totalWithdrawn, 0),
      },
      usd: {
        invested: usd.reduce((s, i) => s + i.totalDeposited, 0),
        currentValue: usd.reduce((s, i) => s + i.currentValue, 0),
        netPL: usd.reduce((s, i) => s + i.netPL, 0),
        fees: usd.reduce((s, i) => s + i.processing_fee, 0),
        withdrawn: usd.reduce((s, i) => s + i.totalWithdrawn, 0),
      },
    }
  }, [getEnrichedInvestments])

  const [showPortfolioSummary, setShowPortfolioSummary] = useState(false)
  const existingPlatforms = useMemo(() => {
    const platforms = new Set<string>()
    for (const inv of investments) platforms.add(inv.platform)
    return Array.from(platforms).sort()
  }, [investments])

  function renderInvestmentsList(group: typeof ngnGroups[number]) {
    return (
      <div className="divide-y divide-zinc-800/50">
        {group.investments.map((inv) => (
          <div key={inv.id}>
            <div
              onClick={() => setExpandedInv(expandedInv === inv.id ? null : inv.id)}
              className="flex items-center justify-between px-4 py-3 hover:bg-[#1a0f00]/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={cn('text-xs transition-transform text-zinc-500',
                  expandedInv === inv.id ? 'rotate-90' : '')}>▶</span>
                <div>
                  <p className="text-sm font-medium text-white">{inv.title}</p>
                  <p className="text-xs text-zinc-500">{inv.buy_date} · {inv.expected_return_pct}% exp. return</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-zinc-400 font-mono">{formatCurrency(inv.totalDeposited, inv.currency)}</span>
                <span className="text-white font-mono">{formatCurrency(inv.currentValue, inv.currency)}</span>
                <span className={cn('font-mono', inv.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                  {inv.netPL >= 0 ? '+' : '-'}{formatCurrency(inv.netPL, inv.currency)}
                  <span className="text-xs ml-1 opacity-70">
                    ({inv.totalDeposited > 0 ? `${((inv.netPL / inv.totalDeposited) * 100).toFixed(1)}%` : '0%'})
                  </span>
                </span>
              </div>
            </div>

            {expandedInv === inv.id && (
              <div className="bg-[#1a0f00]/30 border-t border-[#874708]/20 px-4 py-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                  {[
                    { l: 'Invested', v: formatCurrency(inv.totalDeposited, inv.currency) },
                    { l: 'Fee', v: formatCurrency(inv.processing_fee, inv.currency) },
                    { l: 'Withdrawn', v: formatCurrency(inv.totalWithdrawn, inv.currency) },
                    { l: 'Current Value', v: formatCurrency(inv.currentValue, inv.currency) },
                    { l: 'Net P/L', v: `${inv.netPL >= 0 ? '+' : '-'}${formatCurrency(inv.netPL, inv.currency)}`, c: inv.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]' },
                  ].map((s) => (
                    <div key={s.l} className="bg-[#2a1a00]/50 rounded px-3 py-2">
                      <p className="text-xs text-zinc-500">{s.l}</p>
                      <p className={cn('text-sm font-mono text-zinc-200', (s as any).c)}>{s.v}</p>
                    </div>
                  ))}
                </div>

                {inv.units && inv.unit_price && (
                  <p className="text-xs text-zinc-500 mb-3">
                    {inv.units} units @ {formatCurrency(inv.unit_price, inv.currency)}/unit
                  </p>
                )}

                {inv.notes && (
                  <p className="text-xs text-zinc-500 mb-3">Note: {inv.notes}</p>
                )}

                <div className="flex gap-2 mb-3">
                  <Button size="sm" variant="outline"
                    onClick={() => setTxTarget({ id: inv.id, title: inv.title, type: 'value_update' })}
                    className="border-[#874708]/30 text-zinc-300 hover:bg-[#2a1a00] text-xs">
                    Update Value
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => setTxTarget({ id: inv.id, title: inv.title, type: 'deposit' })}
                    className="border-[#874708]/30 text-zinc-300 hover:bg-[#2a1a00] text-xs">
                    Add Deposit
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => setTxTarget({ id: inv.id, title: inv.title, type: 'withdrawal' })}
                    className="border-[#874708]/30 text-zinc-300 hover:bg-[#2a1a00] text-xs">
                    Withdrawal
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => setYearlyReturnsTarget({ title: inv.title, ids: [inv.id] })}
                    className="border-[#874708]/30 text-[#FF8D19] hover:bg-[#2a1a00] text-xs">
                    📊 Yearly
                  </Button>
                </div>

                {inv.transactions.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Transaction History</p>
                    <div className="space-y-1">
                      {(showAllTxForInv === inv.id ? inv.transactions : inv.transactions.slice(0, 10)).map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between text-xs bg-[#2a1a00]/30 rounded px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className={cn('px-1.5 py-0.5 rounded text-xs',
                              tx.type === 'deposit' ? 'bg-[#FF8D19]/20 text-[#32BC00]'
                                : tx.type === 'withdrawal' ? 'bg-red-600/20 text-[#F32400]'
                                : 'bg-[#FF8D19]/20 text-[#FF8D19]'
                            )}>
                              {tx.type === 'value_update' ? 'Value' : tx.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                            </span>
                            <span className="text-zinc-400">{tx.date}</span>
                            {tx.notes && <span className="text-zinc-600 italic">— {tx.notes}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-zinc-200">{formatCurrency(tx.amount, inv.currency)}</span>
                            <button
                              onClick={() => { removeTransaction(tx.id); toast.success('Transaction removed') }}
                              className="text-zinc-600 hover:text-[#F32400]">
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {inv.transactions.length > 10 && showAllTxForInv !== inv.id && (
                      <button
                        onClick={() => setShowAllTxForInv(inv.id)}
                        className="w-full text-center text-xs text-[#FF8D19] hover:text-[#FF8D19]/80 py-2"
                      >
                        Show all {inv.transactions.length} transactions
                      </button>
                    )}
                    {showAllTxForInv === inv.id && inv.transactions.length > 10 && (
                      <button
                        onClick={() => setShowAllTxForInv(null)}
                        className="w-full text-center text-xs text-zinc-500 hover:text-zinc-400 py-2"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F0800]">
      <Header />

      {/* Summary Bar */}
      {/* NGN Summary */}
      {(summary.ngn.totalInvested > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-[#2a1a00] border-b border-[#874708]/20">
          {[
            { l: 'Invested (₦)', v: formatCurrency(summary.ngn.totalInvested, 'NGN'), c: 'text-white' },
            { l: 'Current Value', v: formatCurrency(summary.ngn.currentValue, 'NGN'), c: 'text-white' },
            { l: 'Fees', v: formatCurrency(summary.ngn.totalFees, 'NGN'), c: 'text-amber-400' },
            { l: 'Withdrawn', v: formatCurrency(summary.ngn.totalWithdrawn, 'NGN'), c: 'text-zinc-300' },
            { l: 'Net P/L', v: `${summary.ngn.netPL >= 0 ? '+' : '-'}${formatCurrency(summary.ngn.netPL, 'NGN')}`, c: summary.ngn.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]', pct: summary.ngn.totalInvested > 0 ? `${summary.ngn.netPL >= 0 ? '+' : ''}${((summary.ngn.netPL / summary.ngn.totalInvested) * 100).toFixed(2)}%` : '' },
          ].map((s) => (
            <div key={s.l} className="bg-[#0F0800] px-4 sm:px-6 py-3">
              <p className="text-xs text-zinc-500">{s.l}</p>
              <p className={cn('text-base sm:text-lg font-mono mt-0.5', s.c)}>{s.v}</p>
              {(s as any).pct && <p className={cn('text-xs font-mono', s.c)}>{(s as any).pct}</p>}
            </div>
          ))}
        </div>
      )}
      {/* USD Summary */}
      {(summary.usd.totalInvested > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-[#2a1a00] border-b border-[#874708]/20">
          {[
            { l: 'Invested ($)', v: formatCurrency(summary.usd.totalInvested, 'USD'), c: 'text-white' },
            { l: 'Current Value', v: formatCurrency(summary.usd.currentValue, 'USD'), c: 'text-white' },
            { l: 'Fees', v: formatCurrency(summary.usd.totalFees, 'USD'), c: 'text-amber-400' },
            { l: 'Withdrawn', v: formatCurrency(summary.usd.totalWithdrawn, 'USD'), c: 'text-zinc-300' },
            { l: 'Net P/L', v: `${summary.usd.netPL >= 0 ? '+' : '-'}${formatCurrency(summary.usd.netPL, 'USD')}`, c: summary.usd.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]', pct: summary.usd.totalInvested > 0 ? `${summary.usd.netPL >= 0 ? '+' : ''}${((summary.usd.netPL / summary.usd.totalInvested) * 100).toFixed(2)}%` : '' },
          ].map((s) => (
            <div key={s.l} className="bg-[#0F0800] px-4 sm:px-6 py-3">
              <p className="text-xs text-zinc-500">{s.l}</p>
              <p className={cn('text-base sm:text-lg font-mono mt-0.5', s.c)}>{s.v}</p>
              {(s as any).pct && <p className={cn('text-xs font-mono', s.c)}>{(s as any).pct}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Yearly Returns Buttons for section summaries */}
      <div className="px-4 sm:px-6 py-1.5 border-b border-[#874708]/20 flex gap-3">
        {summary.ngn.totalInvested > 0 && (
          <button
            onClick={() => setYearlyReturnsTarget({ title: `${activeTab === 'mutual_fund' ? 'Mutual Funds' : activeTab === 'stock' ? 'Stocks' : activeTab === 'treasury_bill' ? 'T-Bills' : 'Savings'} (₦)`, ids: enrichedInvestments.filter((i) => i.type === activeTab && i.currency !== 'USD').map((i) => i.id) })}
            className="text-xs text-[#FF8D19] hover:text-[#FF8D19]/80 font-medium"
          >
            📊 Yearly Returns (₦)
          </button>
        )}
        {summary.usd.totalInvested > 0 && (
          <button
            onClick={() => setYearlyReturnsTarget({ title: `${activeTab === 'mutual_fund' ? 'Mutual Funds' : activeTab === 'stock' ? 'Stocks' : activeTab === 'treasury_bill' ? 'T-Bills' : 'Savings'} ($)`, ids: enrichedInvestments.filter((i) => i.type === activeTab && i.currency === 'USD').map((i) => i.id) })}
            className="text-xs text-[#FF8D19] hover:text-[#FF8D19]/80 font-medium"
          >
            📊 Yearly Returns ($)
          </button>
        )}
        <button
          onClick={() => setYearlyReturnsTarget({ title: 'All Investments' })}
          className="text-xs text-zinc-500 hover:text-zinc-400 font-medium"
        >
          📊 All Yearly Returns
        </button>
      </div>

      {/* Total Portfolio Worth Button + Summary */}
      <div className="px-4 sm:px-6 py-2 border-b border-[#874708]/20">
        <button
          onClick={() => setShowPortfolioSummary(!showPortfolioSummary)}
          className="text-xs font-medium text-[#FF8D19] hover:text-[#FF8D19]/80 transition-colors flex items-center gap-1"
        >
          {showPortfolioSummary ? '▼' : '▶'} Total Portfolio Worth
        </button>

        {showPortfolioSummary && (
          <div className="mt-3 space-y-2">
            {totalPortfolio.ngn.invested > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-px bg-[#2a1a00] rounded-lg overflow-hidden">
                <div className="bg-[#1a0f00] px-4 py-3">
                  <p className="text-xs text-zinc-500">Total Invested (₦)</p>
                  <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(totalPortfolio.ngn.invested, 'NGN')}</p>
                </div>
                <div className="bg-[#1a0f00] px-4 py-3">
                  <p className="text-xs text-zinc-500">Current Worth</p>
                  <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(totalPortfolio.ngn.currentValue, 'NGN')}</p>
                </div>
                <div className="bg-[#1a0f00] px-4 py-3">
                  <p className="text-xs text-zinc-500">Total Fees</p>
                  <p className="text-sm font-mono text-amber-400 mt-0.5">{formatCurrency(totalPortfolio.ngn.fees, 'NGN')}</p>
                </div>
                <div className="bg-[#1a0f00] px-4 py-3">
                  <p className="text-xs text-zinc-500">Total Withdrawn</p>
                  <p className="text-sm font-mono text-zinc-300 mt-0.5">{formatCurrency(totalPortfolio.ngn.withdrawn, 'NGN')}</p>
                </div>
                <div className="bg-[#1a0f00] px-4 py-3">
                  <p className="text-xs text-zinc-500">Total Net P/L</p>
                  <p className={cn('text-sm font-mono mt-0.5', totalPortfolio.ngn.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                    {totalPortfolio.ngn.netPL >= 0 ? '+' : '-'}{formatCurrency(totalPortfolio.ngn.netPL, 'NGN')}
                  </p>
                  <p className={cn('text-xs font-mono', totalPortfolio.ngn.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                    {totalPortfolio.ngn.invested > 0 ? `${totalPortfolio.ngn.netPL >= 0 ? '+' : ''}${((totalPortfolio.ngn.netPL / totalPortfolio.ngn.invested) * 100).toFixed(2)}%` : ''}
                  </p>
                </div>
              </div>
            )}
            {totalPortfolio.usd.invested > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-px bg-[#2a1a00] rounded-lg overflow-hidden">
                <div className="bg-[#1a0f00] px-4 py-3">
                  <p className="text-xs text-zinc-500">Total Invested ($)</p>
                  <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(totalPortfolio.usd.invested, 'USD')}</p>
                </div>
                <div className="bg-[#1a0f00] px-4 py-3">
                  <p className="text-xs text-zinc-500">Current Worth</p>
                  <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(totalPortfolio.usd.currentValue, 'USD')}</p>
                </div>
                <div className="bg-[#1a0f00] px-4 py-3">
                  <p className="text-xs text-zinc-500">Total Fees</p>
                  <p className="text-sm font-mono text-amber-400 mt-0.5">{formatCurrency(totalPortfolio.usd.fees, 'USD')}</p>
                </div>
                <div className="bg-[#1a0f00] px-4 py-3">
                  <p className="text-xs text-zinc-500">Total Withdrawn</p>
                  <p className="text-sm font-mono text-zinc-300 mt-0.5">{formatCurrency(totalPortfolio.usd.withdrawn, 'USD')}</p>
                </div>
                <div className="bg-[#1a0f00] px-4 py-3">
                  <p className="text-xs text-zinc-500">Total Net P/L</p>
                  <p className={cn('text-sm font-mono mt-0.5', totalPortfolio.usd.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                    {totalPortfolio.usd.netPL >= 0 ? '+' : '-'}{formatCurrency(totalPortfolio.usd.netPL, 'USD')}
                  </p>
                  <p className={cn('text-xs font-mono', totalPortfolio.usd.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                    {totalPortfolio.usd.invested > 0 ? `${totalPortfolio.usd.netPL >= 0 ? '+' : ''}${((totalPortfolio.usd.netPL / totalPortfolio.usd.invested) * 100).toFixed(2)}%` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Switcher + Actions */}
      <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#874708]/20">
        <div className="flex gap-1">
          {([['mutual_fund', 'Mutual Funds'], ['stock', 'Stocks'], ['treasury_bill', 'T-Bills'], ['savings', 'Savings']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'px-3 py-1.5 text-sm rounded font-medium transition-colors',
                activeTab === key ? 'bg-[#2a1a00] text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}
          className="bg-[#FF8D19] hover:bg-[#e67d15] text-white text-xs">
          + Add {activeTab === 'mutual_fund' ? 'Fund' : activeTab === 'treasury_bill' ? 'T-Bill' : activeTab === 'savings' ? 'Savings' : 'Stock'}
        </Button>
      </div>

      {/* Content */}
      <main>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <div className="w-3 h-3 border-2 border-zinc-600 border-t-[#FF8D19] rounded-full animate-spin" />
              Loading investments...
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-4 sm:p-6">
            {/* NGN Investments */}
            {ngnGroups.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2 px-1">₦ Naira Investments</p>
                <div className="space-y-4">
                  {ngnGroups.map((group) => (
                    <div key={group.platform} className="border border-[#874708]/20 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-px bg-[#2a1a00]">
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Platform</p>
                          <p className="text-sm font-medium text-white mt-0.5">{group.platform}</p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Invested</p>
                          <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(group.totalInvested)}</p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Fees</p>
                          <p className="text-sm font-mono text-amber-400 mt-0.5">{formatCurrency(group.totalFees)}</p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Withdrawn</p>
                          <p className="text-sm font-mono text-zinc-300 mt-0.5">{formatCurrency(group.totalWithdrawn)}</p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Current Value</p>
                          <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(group.currentValue)}</p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Net P/L</p>
                          <p className={cn('text-sm font-mono mt-0.5', group.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                            {group.netPL >= 0 ? '+' : '-'}{formatCurrency(group.netPL)}
                          </p>
                          <p className={cn('text-xs font-mono', group.totalInvested > 0 ? (group.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]') : 'text-zinc-500')}>
                            {group.totalInvested > 0 ? `${group.netPL >= 0 ? '+' : ''}${((group.netPL / group.totalInvested) * 100).toFixed(2)}%` : ''}
                          </p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3 flex items-center justify-center">
                          <button
                            onClick={() => setYearlyReturnsTarget({ title: group.platform, ids: group.investments.map((i: any) => i.id) })}
                            className="text-xs text-[#FF8D19] hover:text-[#FF8D19]/80 font-medium whitespace-nowrap"
                          >
                            📊 Yearly
                          </button>
                        </div>
                      </div>
                      {renderInvestmentsList(group)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* USD Investments */}
            {usdGroups.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2 px-1">$ Dollar Investments</p>
                <div className="space-y-4">
                  {usdGroups.map((group) => (
                    <div key={group.platform} className="border border-[#874708]/20 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-px bg-[#2a1a00]">
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Platform</p>
                          <p className="text-sm font-medium text-white mt-0.5">{group.platform}</p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Invested</p>
                          <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(group.totalInvested, 'USD')}</p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Fees</p>
                          <p className="text-sm font-mono text-amber-400 mt-0.5">{formatCurrency(group.totalFees, 'USD')}</p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Withdrawn</p>
                          <p className="text-sm font-mono text-zinc-300 mt-0.5">{formatCurrency(group.totalWithdrawn, 'USD')}</p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Current Value</p>
                          <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(group.currentValue, 'USD')}</p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3">
                          <p className="text-xs text-zinc-500">Net P/L</p>
                          <p className={cn('text-sm font-mono mt-0.5', group.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                            {group.netPL >= 0 ? '+' : '-'}{formatCurrency(group.netPL)}
                          </p>
                          <p className={cn('text-xs font-mono', group.totalInvested > 0 ? (group.netPL >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]') : 'text-zinc-500')}>
                            {group.totalInvested > 0 ? `${group.netPL >= 0 ? '+' : ''}${((group.netPL / group.totalInvested) * 100).toFixed(2)}%` : ''}
                          </p>
                        </div>
                        <div className="bg-[#1a0f00] px-4 py-3 flex items-center justify-center">
                          <button
                            onClick={() => setYearlyReturnsTarget({ title: group.platform, ids: group.investments.map((i: any) => i.id) })}
                            className="text-xs text-[#FF8D19] hover:text-[#FF8D19]/80 font-medium whitespace-nowrap"
                          >
                            📊 Yearly
                          </button>
                        </div>
                      </div>
                      {renderInvestmentsList(group)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ngnGroups.length === 0 && usdGroups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <p className="text-lg">No {activeTab === 'mutual_fund' ? 'mutual funds' : activeTab === 'treasury_bill' ? 'treasury bills' : activeTab === 'savings' ? 'savings' : 'stocks'} yet</p>
                <p className="text-sm mt-1">Click the button above to add your first one</p>
              </div>
            )}
          </div>
        )}

        {/* Monthly Earnings for current tab */}
        {monthlyPerformanceForTab.length > 0 && (
          <div className="p-4 sm:p-6 pt-0">
            <div className="border border-[#874708]/20 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#874708]/20">
                <p className="text-sm font-medium text-zinc-300">
                  Monthly Earnings — {activeTab === 'mutual_fund' ? 'Mutual Funds' : activeTab === 'treasury_bill' ? 'Treasury Bills' : 'Stocks'}
                </p>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {monthlyPerformanceForTab.map((m) => (
                  <div key={m.month} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-300">{m.label}</span>
                      <span className={cn('text-sm font-mono font-semibold',
                        m.monthEarning >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                        {m.monthEarning >= 0 ? '+' : '-'}{formatCurrency(m.monthEarning)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 text-xs text-zinc-500">
                        {m.deposits > 0 && <span>Deposited: {formatCurrency(m.deposits)}</span>}
                        {m.withdrawals > 0 && <span>Withdrawn: {formatCurrency(m.withdrawals)}</span>}
                        <span>Value: {formatCurrency(m.totalValue)}</span>
                      </div>
                      <span className={cn('text-xs font-mono',
                        m.earningPct >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                        {m.earningPct >= 0 ? '+' : ''}{m.earningPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Earnings Chart */}
        {monthlyPerformanceCombined.length > 0 && (
          <div className="p-4 sm:p-6 pt-0">
            <div className="border border-[#874708]/20 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#874708]/20 flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-300">Earnings Overview</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#32BC00]" /> Profit</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#F32400]" /> Loss</span>
                </div>
              </div>
              <div className="px-2 sm:px-4 py-6">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={monthlyPerformanceCombined.map((m) => ({
                      name: m.label.split(' ')[0].substring(0, 3),
                      earning: Math.round(m.monthEarning),
                      fullLabel: m.label,
                      pct: m.earningPct,
                    }))}
                    margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#a1a1aa', fontSize: 12 }}
                      axisLine={{ stroke: '#874708', strokeOpacity: 0.2 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => {
                        if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`
                        if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`
                        return v.toString()
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(135,71,8,0.08)' }}
                      contentStyle={{
                        background: '#0F0800',
                        border: '1px solid rgba(135,71,8,0.4)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '13px',
                        padding: '10px 14px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                      }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '4px' }}
                      formatter={(value) => {
                        const num = Number(value)
                        const color = num >= 0 ? '#32BC00' : '#F32400'
                        return [<span style={{ color, fontFamily: 'monospace', fontWeight: 600 }}>{num >= 0 ? '+' : '-'}{formatCurrency(num)}</span>, 'Earning']
                      }}
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload
                        if (!item) return ''
                        return `${item.fullLabel} (${item.pct >= 0 ? '+' : ''}${item.pct.toFixed(2)}%)`
                      }}
                    />
                    <Bar dataKey="earning" radius={[8, 8, 0, 0]} maxBarSize={50}>
                      {monthlyPerformanceCombined.map((m, idx) => (
                        <Cell
                          key={idx}
                          fill={m.monthEarning >= 0 ? '#32BC00' : '#F32400'}
                          fillOpacity={0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        
        {/* Combined Monthly Earnings */}
        {monthlyPerformanceCombined.length > 0 && (
          <div className="p-4 sm:p-6 pt-0">
            <div className="border border-[#874708]/20 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#874708]/20">
                <p className="text-sm font-medium text-zinc-300">Monthly Earnings — All Investments</p>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {monthlyPerformanceCombined.map((m) => (
                  <div key={m.month} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-300">{m.label}</span>
                      <span className={cn('text-sm font-mono font-semibold',
                        m.monthEarning >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                        {m.monthEarning >= 0 ? '+' : '-'}{formatCurrency(m.monthEarning)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 text-xs text-zinc-500">
                        {m.deposits > 0 && <span>Deposited: {formatCurrency(m.deposits)}</span>}
                        {m.withdrawals > 0 && <span>Withdrawn: {formatCurrency(m.withdrawals)}</span>}
                        <span>Value: {formatCurrency(m.totalValue)}</span>
                      </div>
                      <span className={cn('text-xs font-mono',
                        m.earningPct >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                        {m.earningPct >= 0 ? '+' : ''}{m.earningPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* Yearly Returns Modal */}
      {yearlyReturnsTarget && (
        <Dialog open={!!yearlyReturnsTarget} onOpenChange={(isOpen) => !isOpen && setYearlyReturnsTarget(null)}>
          <DialogContent className="bg-[#1a0f00] border-[#874708]/20 text-white max-w-md! max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-base">
                Yearly Returns — {yearlyReturnsTarget.title}
              </DialogTitle>
              <p className="text-xs text-zinc-500 mt-1">Time-weighted return (deposit/withdrawal adjusted)</p>
            </DialogHeader>
            <div className="space-y-2 mt-3">
              {(() => {
                const data = getYearlyReturns(yearlyReturnsTarget.ids)
                if (data.length === 0) return <p className="text-sm text-zinc-500 py-4 text-center">No yearly data available yet. Add value updates to see returns.</p>
                return data.map((yr) => (
                  <div key={yr.year} className="bg-[#2a1a00]/50 rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">{yr.year}</span>
                      <span className={cn('text-lg font-mono font-bold', yr.twr >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                        {yr.twr >= 0 ? '+' : ''}{yr.twr.toFixed(2)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-500">Earning</span>
                        <p className={cn('font-mono', yr.totalEarning >= 0 ? 'text-[#32BC00]' : 'text-[#F32400]')}>
                          {yr.totalEarning >= 0 ? '+' : '-'}{formatCurrency(yr.totalEarning)}
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-500">End Value</span>
                        <p className="font-mono text-zinc-200">{formatCurrency(yr.endValue)}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Deposited</span>
                        <p className="font-mono text-zinc-300">{formatCurrency(yr.totalDeposits)}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Withdrawn</span>
                        <p className="font-mono text-zinc-300">{formatCurrency(yr.totalWithdrawals)}</p>
                      </div>
                      {yr.totalFees > 0 && (
                        <div>
                          <span className="text-zinc-500">Fees Paid</span>
                          <p className="font-mono text-amber-400">{formatCurrency(yr.totalFees)}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-zinc-500">Start Value</span>
                        <p className="font-mono text-zinc-300">{formatCurrency(yr.startValue)}</p>
                      </div>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
      </main>

      <AddInvestmentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={addInvestment}
        defaultType={activeTab}
        existingPlatforms={existingPlatforms}
      />

      {txTarget && (
        <TransactionModal
          open={!!txTarget}
          onClose={() => setTxTarget(null)}
          onSubmit={async (tx) => {
            const result = await addTransaction(tx)
            return result
          }}
          investmentId={txTarget.id}
          investmentTitle={txTarget.title}
          defaultType={txTarget.type}
          currentValue={enrichedInvestments.find((i) => i.id === txTarget.id)?.currentValue}
        />
      )}
    </div>
  )
}