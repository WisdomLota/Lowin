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

  const platformGroups = useMemo(() => getPlatformGroups(activeTab), [getPlatformGroups, activeTab])

  // Overall summary
  const summary = useMemo(() => {
    return {
      totalInvested: platformGroups.reduce((s, g) => s + g.totalInvested, 0),
      totalFees: platformGroups.reduce((s, g) => s + g.totalFees, 0),
      totalWithdrawn: platformGroups.reduce((s, g) => s + g.totalWithdrawn, 0),
      currentValue: platformGroups.reduce((s, g) => s + g.currentValue, 0),
      netPL: platformGroups.reduce((s, g) => s + g.netPL, 0),
    }
  }, [platformGroups])

  const monthlyPerformance = useMemo(() => getMonthlyPerformance(), [getMonthlyPerformance])
  const enrichedInvestments = useMemo(() => getEnrichedInvestments(), [getEnrichedInvestments])

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-zinc-800 border-b border-zinc-800">
        {[
          { l: 'Total Invested', v: formatCurrency(summary.totalInvested), c: 'text-white' },
          { l: 'Current Value', v: formatCurrency(summary.currentValue), c: 'text-white' },
          { l: 'Total Fees', v: formatCurrency(summary.totalFees), c: 'text-amber-400' },
          { l: 'Withdrawn', v: formatCurrency(summary.totalWithdrawn), c: 'text-zinc-300' },
          { l: 'Net P/L', v: `${summary.netPL >= 0 ? '+' : '-'}${formatCurrency(summary.netPL)}`, c: summary.netPL >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map((s) => (
          <div key={s.l} className="bg-zinc-950 px-4 sm:px-6 py-3">
            <p className="text-xs text-zinc-500">{s.l}</p>
            <p className={cn('text-base sm:text-lg font-mono mt-0.5', s.c)}>{s.v}</p>
          </div>
        ))}
      </div>

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
        ) : platformGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <p className="text-lg">No {activeTab === 'mutual_fund' ? 'mutual funds' : 'stocks'} yet</p>
            <p className="text-sm mt-1">Click the button above to add your first one</p>
          </div>
        ) : (
          <div className="space-y-4 p-4 sm:p-6">
            {platformGroups.map((group) => (
              <div key={group.platform} className="border border-zinc-800 rounded-lg overflow-hidden">
                {/* Platform header */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-zinc-800">
                  <div className="bg-zinc-900 px-4 py-3 sm:col-span-1">
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

                {/* Investments list */}
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
                          <span className="text-zinc-400 font-mono">{formatCurrency(inv.totalDeposited)}</span>
                          <span className="text-white font-mono">{formatCurrency(inv.currentValue)}</span>
                          <span className={cn('font-mono', inv.netPL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {inv.netPL >= 0 ? '+' : '-'}{formatCurrency(inv.netPL)}
                          </span>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {expandedInv === inv.id && (
                        <div className="bg-zinc-900/30 border-t border-zinc-800 px-4 py-3">
                          {/* Stats */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                            {[
                              { l: 'Invested', v: formatCurrency(inv.totalDeposited) },
                              { l: 'Fee', v: formatCurrency(inv.processing_fee) },
                              { l: 'Withdrawn', v: formatCurrency(inv.totalWithdrawn) },
                              { l: 'Current Value', v: formatCurrency(inv.currentValue) },
                            ].map((s) => (
                              <div key={s.l} className="bg-zinc-800/50 rounded px-3 py-2">
                                <p className="text-xs text-zinc-500">{s.l}</p>
                                <p className="text-sm font-mono text-zinc-200">{s.v}</p>
                              </div>
                            ))}
                          </div>

                          {inv.units && inv.unit_price && (
                            <p className="text-xs text-zinc-500 mb-3">
                              {inv.units} units @ {formatCurrency(inv.unit_price)}/unit
                            </p>
                          )}

                          {inv.notes && (
                            <p className="text-xs text-zinc-500 mb-3">Note: {inv.notes}</p>
                          )}

                          {/* Action buttons */}
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

                          {/* Transaction history */}
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
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-zinc-200">{formatCurrency(tx.amount)}</span>
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
              </div>
            ))}
          </div>
        )}

        {/* Monthly Performance */}
        {monthlyPerformance.length > 0 && (
          <div className="p-4 sm:p-6">
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-sm font-medium text-zinc-300">Monthly Performance</p>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {monthlyPerformance.map((m) => (
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