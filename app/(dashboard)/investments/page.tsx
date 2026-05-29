'use client'

import { useState, useMemo } from 'react'
import { useInvestments, InvestmentWithData } from '@/hooks/useInvestments'
import { Header } from '@/components/layout/header'
import { AddInvestmentModal } from '@/components/investments/add-investment-modal'
import { TransactionModal } from '@/components/investments/transaction-modal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type InvTab = 'mutual_fund' | 'stock'

function formatCurrency(amount: number, currency: string = 'NGN'): string {
  const symbol = currency === 'USD' ? '$' : '₦'
  return `${symbol}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function InvestmentsPage() {
  const {
    loading, addInvestment, removeInvestment,
    addTransaction, removeTransaction,
    getPlatformGroups, getMonthlyPerformance, getEnrichedInvestments,
  } = useInvestments()

  const [activeTab, setActiveTab] = useState<InvTab>('mutual_fund')
  const [addOpen, setAddOpen] = useState(false)
  const [txTarget, setTxTarget] = useState<{ id: string; title: string; type: 'deposit' | 'withdrawal' | 'value_update' } | null>(null)
  const [expandedInv, setExpandedInv] = useState<string | null>(null)

  const allPlatformGroups = useMemo(() => getPlatformGroups(activeTab), [getPlatformGroups, activeTab])

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

  function renderInvestmentsList(group: typeof ngnGroups[number]) {
    return (
      <div className="divide-y divide-zinc-800/50">
        {group.investments.map((inv) => (
          <div key={inv.id}>
            <div
              onClick={() => setExpandedInv(expandedInv === inv.id ? null : inv.id)}
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-900/50 cursor-pointer transition-colors"
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
                <span className={cn('font-mono', inv.netPL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {inv.netPL >= 0 ? '+' : '-'}{formatCurrency(inv.netPL, inv.currency)}
                </span>
              </div>
            </div>

            {expandedInv === inv.id && (
              <div className="bg-zinc-900/30 border-t border-zinc-800 px-4 py-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                  {[
                    { l: 'Invested', v: formatCurrency(inv.totalDeposited, inv.currency) },
                    { l: 'Fee', v: formatCurrency(inv.processing_fee, inv.currency) },
                    { l: 'Withdrawn', v: formatCurrency(inv.totalWithdrawn, inv.currency) },
                    { l: 'Current Value', v: formatCurrency(inv.currentValue, inv.currency) },
                    { l: 'Net P/L', v: `${inv.netPL >= 0 ? '+' : '-'}${formatCurrency(inv.netPL, inv.currency)}`, c: inv.netPL >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  ].map((s) => (
                    <div key={s.l} className="bg-zinc-800/50 rounded px-3 py-2">
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
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs">
                    Update Value
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => setTxTarget({ id: inv.id, title: inv.title, type: 'deposit' })}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs">
                    Add Deposit
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => setTxTarget({ id: inv.id, title: inv.title, type: 'withdrawal' })}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs">
                    Withdrawal
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => { removeInvestment(inv.id); toast.success('Investment removed') }}
                    className="text-zinc-600 hover:text-red-400 text-xs ml-auto">
                    Delete
                  </Button>
                </div>

                {inv.transactions.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Transaction History</p>
                    <div className="space-y-1">
                      {inv.transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between text-xs bg-zinc-800/30 rounded px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className={cn('px-1.5 py-0.5 rounded text-xs',
                              tx.type === 'deposit' ? 'bg-emerald-600/20 text-emerald-400'
                                : tx.type === 'withdrawal' ? 'bg-red-600/20 text-red-400'
                                : 'bg-blue-600/20 text-blue-400'
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
                              className="text-zinc-600 hover:text-red-400">
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
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
    <div className="min-h-screen bg-zinc-950">
      <Header />

      {/* Summary Bar */}
      {/* NGN Summary */}
      {(summary.ngn.totalInvested > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-zinc-800 border-b border-zinc-800">
          {[
            { l: 'Invested (₦)', v: formatCurrency(summary.ngn.totalInvested, 'NGN'), c: 'text-white' },
            { l: 'Current Value', v: formatCurrency(summary.ngn.currentValue, 'NGN'), c: 'text-white' },
            { l: 'Fees', v: formatCurrency(summary.ngn.totalFees, 'NGN'), c: 'text-amber-400' },
            { l: 'Withdrawn', v: formatCurrency(summary.ngn.totalWithdrawn, 'NGN'), c: 'text-zinc-300' },
            { l: 'Net P/L', v: `${summary.ngn.netPL >= 0 ? '+' : '-'}${formatCurrency(summary.ngn.netPL, 'NGN')}`, c: summary.ngn.netPL >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map((s) => (
            <div key={s.l} className="bg-zinc-950 px-4 sm:px-6 py-3">
              <p className="text-xs text-zinc-500">{s.l}</p>
              <p className={cn('text-base sm:text-lg font-mono mt-0.5', s.c)}>{s.v}</p>
            </div>
          ))}
        </div>
      )}
      {/* USD Summary */}
      {(summary.usd.totalInvested > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-zinc-800 border-b border-zinc-800">
          {[
            { l: 'Invested ($)', v: formatCurrency(summary.usd.totalInvested, 'USD'), c: 'text-white' },
            { l: 'Current Value', v: formatCurrency(summary.usd.currentValue, 'USD'), c: 'text-white' },
            { l: 'Fees', v: formatCurrency(summary.usd.totalFees, 'USD'), c: 'text-amber-400' },
            { l: 'Withdrawn', v: formatCurrency(summary.usd.totalWithdrawn, 'USD'), c: 'text-zinc-300' },
            { l: 'Net P/L', v: `${summary.usd.netPL >= 0 ? '+' : '-'}${formatCurrency(summary.usd.netPL, 'USD')}`, c: summary.usd.netPL >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map((s) => (
            <div key={s.l} className="bg-zinc-950 px-4 sm:px-6 py-3">
              <p className="text-xs text-zinc-500">{s.l}</p>
              <p className={cn('text-base sm:text-lg font-mono mt-0.5', s.c)}>{s.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab Switcher + Actions */}
      <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800">
        <div className="flex gap-1">
          {([['mutual_fund', 'Mutual Funds'], ['stock', 'Stocks']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'px-3 py-1.5 text-sm rounded font-medium transition-colors',
                activeTab === key ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
          + Add {activeTab === 'mutual_fund' ? 'Fund' : 'Stock'}
        </Button>
      </div>

      {/* Content */}
      <main>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <div className="w-3 h-3 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
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
                    <div key={group.platform} className="border border-zinc-800 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-px bg-zinc-800">
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Platform</p>
                          <p className="text-sm font-medium text-white mt-0.5">{group.platform}</p>
                        </div>
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Invested</p>
                          <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(group.totalInvested)}</p>
                        </div>
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Fees</p>
                          <p className="text-sm font-mono text-amber-400 mt-0.5">{formatCurrency(group.totalFees)}</p>
                        </div>
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Withdrawn</p>
                          <p className="text-sm font-mono text-zinc-300 mt-0.5">{formatCurrency(group.totalWithdrawn)}</p>
                        </div>
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Current Value</p>
                          <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(group.currentValue)}</p>
                        </div>
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Net P/L</p>
                          <p className={cn('text-sm font-mono mt-0.5', group.netPL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {group.netPL >= 0 ? '+' : '-'}{formatCurrency(group.netPL)}
                          </p>
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
                    <div key={group.platform} className="border border-zinc-800 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-px bg-zinc-800">
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Platform</p>
                          <p className="text-sm font-medium text-white mt-0.5">{group.platform}</p>
                        </div>
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Invested</p>
                          <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(group.totalInvested, 'USD')}</p>
                        </div>
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Fees</p>
                          <p className="text-sm font-mono text-amber-400 mt-0.5">{formatCurrency(group.totalFees, 'USD')}</p>
                        </div>
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Withdrawn</p>
                          <p className="text-sm font-mono text-zinc-300 mt-0.5">{formatCurrency(group.totalWithdrawn, 'USD')}</p>
                        </div>
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Current Value</p>
                          <p className="text-sm font-mono text-white mt-0.5">{formatCurrency(group.currentValue, 'USD')}</p>
                        </div>
                        <div className="bg-zinc-900 px-4 py-3">
                          <p className="text-xs text-zinc-500">Net P/L</p>
                          <p className={cn('text-sm font-mono mt-0.5', group.netPL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {group.netPL >= 0 ? '+' : '-'}{formatCurrency(group.netPL, 'USD')}
                          </p>
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
                <p className="text-lg">No {activeTab === 'mutual_fund' ? 'mutual funds' : 'stocks'} yet</p>
                <p className="text-sm mt-1">Click the button above to add your first one</p>
              </div>
            )}
          </div>
        )}

        {/* Monthly Performance for current tab */}
        {monthlyPerformanceForTab.length > 0 && (
          <div className="p-4 sm:p-6 pt-0">
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-sm font-medium text-zinc-300">
                  Monthly Performance — {activeTab === 'mutual_fund' ? 'Mutual Funds' : 'Stocks'}
                </p>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {monthlyPerformanceForTab.map((m) => (
                  <div key={m.month} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-zinc-300">{m.label}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-zinc-400 font-mono">{formatCurrency(m.totalValue)}</span>
                      <span className={cn('font-mono', m.netPL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {m.netPL >= 0 ? '+' : '-'}{formatCurrency(m.netPL)}
                      </span>
                      <span className={cn('font-mono text-xs', m.plPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {m.plPct >= 0 ? '+' : ''}{m.plPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Combined Monthly Performance */}
        {monthlyPerformanceCombined.length > 0 && (
          <div className="p-4 sm:p-6 pt-0">
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-sm font-medium text-zinc-300">Monthly Performance — All Investments</p>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {monthlyPerformanceCombined.map((m) => (
                  <div key={m.month} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-zinc-300">{m.label}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-zinc-400 font-mono">{formatCurrency(m.totalValue)}</span>
                      <span className={cn('font-mono', m.netPL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {m.netPL >= 0 ? '+' : '-'}{formatCurrency(m.netPL)}
                      </span>
                      <span className={cn('font-mono text-xs', m.plPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {m.plPct >= 0 ? '+' : ''}{m.plPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <AddInvestmentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={addInvestment}
        defaultType={activeTab}
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