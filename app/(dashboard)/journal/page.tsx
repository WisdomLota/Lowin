'use client'

import { useState, useMemo } from 'react'
import { useTrades } from '@/hooks/useTrades'
import { Header } from '@/components/layout/header'
import { TradeFormModal } from '@/components/trades/trade-form-modal'
import { ImportTradesModal } from '@/components/trades/import-trades-modal'
import { exportTradesToExcel, exportTradesToPDF } from '@/lib/export-trades'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ViewMode = 'trades' | 'monthly' | 'yearly'

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(monthKey: string) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const [y, m] = monthKey.split('-')
  return `${months[parseInt(m) - 1]} ${y}`
}

function TradesTable({ trades, onDelete }: { trades: any[]; onDelete: (id: string) => void }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
        <p className="text-base">No trades found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-225">
        <thead>
          <tr className="text-xs text-zinc-500 border-b border-zinc-800">
            <th className="text-left py-2.5 px-3 font-medium">#</th>
            <th className="text-left py-2.5 px-3 font-medium">Date</th>
            <th className="text-left py-2.5 px-3 font-medium">Name</th>
            <th className="text-right py-2.5 px-3 font-medium">Amt</th>
            <th className="text-right py-2.5 px-3 font-medium">Stkd</th>
            <th className="text-center py-2.5 px-3 font-medium">Lev</th>
            <th className="text-right py-2.5 px-3 font-medium">Open</th>
            <th className="text-right py-2.5 px-3 font-medium">Close</th>
            <th className="text-center py-2.5 px-3 font-medium">P/L</th>
            <th className="text-right py-2.5 px-3 font-medium">%P/L</th>
            <th className="text-right py-2.5 px-3 font-medium">Amt P/L</th>
            <th className="text-center py-2.5 px-3 font-medium">Dir</th>
            <th className="text-left py-2.5 px-3 font-medium">Hint</th>
            <th className="text-left py-2.5 px-3 font-medium">Comments</th>
            <th className="py-2.5 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, i) => (
            <tr key={trade.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
              <td className="py-2.5 px-3 text-xs text-zinc-500">{i + 1}</td>
              <td className="py-2.5 px-3 text-sm text-zinc-300">{trade.date}</td>
              <td className="py-2.5 px-3 text-sm font-medium text-white">{trade.name}</td>
              <td className="py-2.5 px-3 text-sm text-right font-mono text-zinc-300">{trade.amount.toFixed(2)}</td>
              <td className="py-2.5 px-3 text-sm text-right font-mono text-zinc-400">{trade.staked > 0 ? trade.staked.toFixed(2) : '—'}</td>
              <td className="py-2.5 px-3 text-sm text-center text-zinc-400">{trade.leverage}</td>
              <td className="py-2.5 px-3 text-sm text-right font-mono text-zinc-300">{trade.open_price}</td>
              <td className="py-2.5 px-3 text-sm text-right font-mono text-zinc-300">{trade.close_price}</td>
              <td className={cn('py-2.5 px-3 text-sm text-center font-semibold',
                trade.pl_type === 'P' ? 'text-emerald-400' : 'text-red-400')}>
                {trade.pl_type}
              </td>
              <td className={cn('py-2.5 px-3 text-sm text-right font-mono',
                trade.pl_type === 'P' ? 'text-emerald-400' : 'text-red-400')}>
                {trade.pl_percentage}%
              </td>
              <td className={cn('py-2.5 px-3 text-sm text-right font-mono',
                trade.pl_type === 'P' ? 'text-emerald-400' : 'text-red-400')}>
                {trade.amount_pl.toFixed(4)}
              </td>
              <td className="py-2.5 px-3 text-sm text-center text-zinc-400">{trade.lg_st}</td>
              <td className="py-2.5 px-3 text-xs text-zinc-500 max-w-30 truncate">{trade.hint || '—'}</td>
              <td className="py-2.5 px-3 text-xs text-zinc-500 max-w-50 truncate">{trade.comments || '—'}</td>
              <td className="py-2.5 px-3 text-right">
                <Button variant="ghost" size="sm"
                  onClick={() => { onDelete(trade.id); toast.success('Trade deleted') }}
                  className="text-zinc-600 hover:text-red-400 hover:bg-transparent text-xs">
                  Del
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatsBar({ trades, label }: { trades: any[]; label?: string }) {
  const profits = trades.filter((t) => t.pl_type === 'P').length
  const losses = trades.filter((t) => t.pl_type === 'L').length
  const winRate = trades.length > 0 ? (profits / trades.length) * 100 : 0
  const totalPL = trades.reduce((sum, t) => {
    return sum + (t.pl_type === 'P' ? Math.abs(t.amount_pl) : -Math.abs(t.amount_pl))
  }, 0)

  return (
    <div>
      {label && (
        <div className="px-4 sm:px-6 py-2 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-300">{label}</span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-zinc-800">
        {[
          { l: 'Trades', v: trades.length.toString(), c: 'text-white' },
          { l: 'Wins', v: profits.toString(), c: 'text-emerald-400' },
          { l: 'Losses', v: losses.toString(), c: 'text-red-400' },
          { l: 'Win Rate', v: `${winRate.toFixed(1)}%`, c: winRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
          { l: 'Net P/L', v: `${totalPL >= 0 ? '+' : ''}$${totalPL.toFixed(2)}`, c: totalPL >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map((s) => (
          <div key={s.l} className="bg-zinc-950 px-4 sm:px-6 py-3">
            <p className="text-xs text-zinc-500">{s.l}</p>
            <p className={cn('text-base sm:text-lg font-mono mt-0.5', s.c)}>{s.v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function JournalPage() {
  const { trades, loading, addTrade, removeTrade, fetchTrades, getMonthlySummaries, getYearlySummaries } = useTrades()
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('trades')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [expandedYear, setExpandedYear] = useState<number | null>(null)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [tradeFilter, setTradeFilter] = useState<'combined' | 'real' | 'demo'>('combined')

  // Filter all trades by mode
  const filteredByMode = useMemo(() => {
    if (tradeFilter === 'combined') return trades
    return trades.filter((t) => t.trade_mode === tradeFilter)
  }, [trades, tradeFilter])

  const monthlySummaries = useMemo(() => {
    const grouped = new Map<string, any[]>()
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']

    for (const trade of filteredByMode) {
      const key = trade.date.substring(0, 7)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(trade)
    }

    return Array.from(grouped.entries())
      .map(([month, monthTrades]) => {
        const [y, m] = month.split('-')
        const label = `${monthNames[parseInt(m) - 1]} ${y}`
        const profits = monthTrades.filter((t: any) => t.pl_type === 'P').length
        const losses = monthTrades.filter((t: any) => t.pl_type === 'L').length
        const totalPL = monthTrades.reduce((sum: number, t: any) => {
          return sum + (t.pl_type === 'P' ? Math.abs(t.amount_pl) : -Math.abs(t.amount_pl))
        }, 0)
        return {
          month, label, totalTrades: monthTrades.length, profits, losses,
          winRate: monthTrades.length > 0 ? (profits / monthTrades.length) * 100 : 0,
          totalPL, totalAmountPL: 0, avgPLPercent: 0,
        }
      })
      .sort((a, b) => b.month.localeCompare(a.month))
  }, [filteredByMode])

  const yearlySummaries = useMemo(() => {
    const grouped = new Map<number, any[]>()

    for (const trade of filteredByMode) {
      const year = parseInt(trade.date.substring(0, 4))
      if (!grouped.has(year)) grouped.set(year, [])
      grouped.get(year)!.push(trade)
    }

    return Array.from(grouped.entries())
      .map(([year, yearTrades]) => {
        const profits = yearTrades.filter((t: any) => t.pl_type === 'P').length
        const losses = yearTrades.filter((t: any) => t.pl_type === 'L').length
        const totalPL = yearTrades.reduce((sum: number, t: any) => {
          return sum + (t.pl_type === 'P' ? Math.abs(t.amount_pl) : -Math.abs(t.amount_pl))
        }, 0)
        return {
          year, totalTrades: yearTrades.length, profits, losses,
          winRate: yearTrades.length > 0 ? (profits / yearTrades.length) * 100 : 0,
          totalPL, totalAmountPL: 0,
          months: monthlySummaries.filter((m) => m.month.startsWith(year.toString())),
        }
      })
      .sort((a, b) => b.year - a.year)
  }, [filteredByMode, monthlySummaries])

  const currentMonthKey = getCurrentMonthKey()
  const currentMonthTrades = useMemo(() => {
    return filteredByMode.filter((t) => t.date.startsWith(currentMonthKey))
  }, [filteredByMode, currentMonthKey])

  const displayedTrades = useMemo(() => {
    if (selectedMonth) {
      return filteredByMode.filter((t) => t.date.startsWith(selectedMonth))
    }
    return filteredByMode
  }, [filteredByMode, selectedMonth])

  const expandedMonthTrades = useMemo(() => {
    if (!expandedMonth) return []
    return filteredByMode.filter((t) => t.date.startsWith(expandedMonth))
  }, [filteredByMode, expandedMonth])

  function handleMonthClick(monthKey: string) {
    if (expandedMonth === monthKey) {
      setExpandedMonth(null)
    } else {
      setExpandedMonth(monthKey)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

      {/* Mode Toggle */}
      <div className="px-4 sm:px-6 py-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-sm text-zinc-400">Trading Mode</span>
        <div className="flex gap-1 border border-zinc-800 rounded-lg p-0.5">
          {(['real', 'demo', 'combined'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setTradeFilter(mode); setExpandedMonth(null) }}
              className={cn(
                'px-4 py-1.5 text-sm rounded font-medium capitalize transition-colors',
                tradeFilter === mode
                  ? mode === 'demo' ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                    : mode === 'real' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                    : 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Overall Stats */}
      <StatsBar trades={filteredByMode} label={`Overall Performance — ${tradeFilter === 'combined' ? 'All Trades' : tradeFilter === 'real' ? 'Real Trades' : 'Demo Trades'}`} />

      {/* Current Month Section */}
      <StatsBar trades={currentMonthTrades} label={`Current Month — ${getMonthLabel(currentMonthKey)}`} />

      {/* Controls */}
      <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 border-t border-t-zinc-800">
        <div className="flex gap-1">
          {(['trades', 'monthly', 'yearly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); setSelectedMonth(null); setExpandedMonth(null); setExpandedYear(null) }}
              className={cn(
                'px-3 py-1.5 text-sm rounded font-medium capitalize transition-colors',
                viewMode === mode
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedMonth && (
            <Button size="sm" variant="outline" onClick={() => setSelectedMonth(null)}
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs">
              Show All Trades
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => {
            exportTradesToExcel(displayedTrades, `lowin-trades-${new Date().toISOString().split('T')[0]}`)
            toast.success('Excel file downloaded')
          }} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs">
            Export Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            exportTradesToPDF(displayedTrades, monthlySummaries, `lowin-trades-${new Date().toISOString().split('T')[0]}`)
          }} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs">
            Export PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}
            className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs">
            Import Excel
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
            + Log Trade
          </Button>
        </div>
      </div>

      <main>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <div className="w-3 h-3 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
              Loading trades...
            </div>
          </div>
        ) : viewMode === 'trades' ? (
          /* ---- TRADES VIEW ---- */
          <>
            {selectedMonth && (
              <div className="px-4 sm:px-6 py-2 border-b border-zinc-800">
                <span className="text-sm text-zinc-400">
                  Showing trades for <span className="text-white font-medium">{getMonthLabel(selectedMonth)}</span>
                </span>
              </div>
            )}
            <TradesTable trades={displayedTrades} onDelete={removeTrade} />
          </>

        ) : viewMode === 'monthly' ? (
          /* ---- MONTHLY VIEW ---- */
          monthlySummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <p className="text-lg">No data yet</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {monthlySummaries.map((s) => (
                <div key={s.month}>
                  {/* Month row */}
                  <div
                    onClick={() => handleMonthClick(s.month)}
                    className="flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-zinc-900/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        'text-xs transition-transform',
                        expandedMonth === s.month ? 'rotate-90' : ''
                      )}>▶</span>
                      <span className="text-sm font-medium text-white">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-zinc-400">{s.totalTrades} trades</span>
                      <span className="text-emerald-400">{s.profits}W</span>
                      <span className="text-red-400">{s.losses}L</span>
                      <span className={cn('font-mono',
                        s.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>
                        {s.winRate.toFixed(0)}%
                      </span>
                      <span className={cn('font-mono min-w-20 text-right',
                        s.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {s.totalPL >= 0 ? '+' : ''}${s.totalPL.toFixed(2)}
                      </span>
                      <Button variant="ghost" size="sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedMonth(s.month); setViewMode('trades') }}
                        className="text-zinc-500 hover:text-white text-xs">
                        Filter
                      </Button>
                    </div>
                  </div>

                  {/* Expanded trades for this month */}
                  {expandedMonth === s.month && (
                    <div className="bg-zinc-900/30 border-t border-zinc-800">
                      <TradesTable trades={expandedMonthTrades} onDelete={removeTrade} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )

        ) : (
          /* ---- YEARLY VIEW ---- */
          yearlySummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <p className="text-lg">No data yet</p>
            </div>
          ) : (
            <div className="space-y-4 p-4 sm:p-6">
              {yearlySummaries.map((y) => (
                <div key={y.year} className="border border-zinc-800 rounded-lg overflow-hidden">
                  {/* Year header stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-zinc-800">
                    <div className="bg-zinc-900 px-4 py-3">
                      <p className="text-xs text-zinc-500">Year</p>
                      <p className="text-lg font-bold text-white">{y.year}</p>
                    </div>
                    <div className="bg-zinc-900 px-4 py-3">
                      <p className="text-xs text-zinc-500">Trades</p>
                      <p className="text-lg font-mono text-white">{y.totalTrades}</p>
                    </div>
                    <div className="bg-zinc-900 px-4 py-3">
                      <p className="text-xs text-zinc-500">Win Rate</p>
                      <p className={cn('text-lg font-mono', y.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>
                        {y.winRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-zinc-900 px-4 py-3">
                      <p className="text-xs text-zinc-500">W / L</p>
                      <p className="text-lg font-mono text-white">
                        <span className="text-emerald-400">{y.profits}</span>
                        {' / '}
                        <span className="text-red-400">{y.losses}</span>
                      </p>
                    </div>
                    <div className="bg-zinc-900 px-4 py-3">
                      <p className="text-xs text-zinc-500">Net P/L</p>
                      <p className={cn('text-lg font-mono', y.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {y.totalPL >= 0 ? '+' : ''}${y.totalPL.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Monthly breakdown — expandable */}
                  <div className="divide-y divide-zinc-800/50">
                    {y.months.map((m) => (
                      <div key={m.month}>
                        <div
                          onClick={() => handleMonthClick(m.month)}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-900/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'text-xs transition-transform text-zinc-500',
                              expandedMonth === m.month ? 'rotate-90' : ''
                            )}>▶</span>
                            <span className="text-sm text-zinc-300">{m.label}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-zinc-500">{m.totalTrades}</span>
                            <span className={cn('font-mono text-xs',
                              m.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>
                              {m.winRate.toFixed(0)}% WR
                            </span>
                            <span className={cn('font-mono text-xs min-w-17.5 text-right',
                              m.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {m.totalPL >= 0 ? '+' : ''}${m.totalPL.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Expanded trades */}
                        {expandedMonth === m.month && (
                          <div className="bg-zinc-900/30 border-t border-zinc-800">
                            <TradesTable trades={expandedMonthTrades} onDelete={removeTrade} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      <TradeFormModal open={formOpen} onClose={() => setFormOpen(false)} onSubmit={addTrade} />
      <ImportTradesModal open={importOpen} onClose={() => setImportOpen(false)} onSuccess={() => fetchTrades()} />
    </div>
  )
}