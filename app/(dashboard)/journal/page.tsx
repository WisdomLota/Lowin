'use client'

import { useState, useMemo } from 'react'
import { useTrades } from '@/hooks/useTrades'
import { Header } from '@/components/layout/header'
import { TradeFormModal } from '@/components/trades/trade-form-modal'
import { exportTradesToExcel, exportTradesToPDF } from '@/lib/export-trades'
import { ImportTradesModal } from '@/components/trades/import-trades-modal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ViewMode = 'trades' | 'monthly' | 'yearly'

export default function JournalPage() {
  const { trades, loading, addTrade, removeTrade, fetchTrades, getMonthlySummaries, getYearlySummaries } = useTrades()
  const [formOpen, setFormOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('trades')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const [importOpen, setImportOpen] = useState(false)

  const monthlySummaries = useMemo(() => getMonthlySummaries(), [getMonthlySummaries])
  const yearlySummaries = useMemo(() => getYearlySummaries(), [getYearlySummaries])

  // Filter trades by selected month
  const displayedTrades = useMemo(() => {
    if (selectedMonth) {
      return trades.filter((t) => t.date.startsWith(selectedMonth))
    }
    return trades
  }, [trades, selectedMonth])

  // Overall stats
  const overallStats = useMemo(() => {
    const t = displayedTrades
    const profits = t.filter((tr) => tr.pl_type === 'P').length
    const losses = t.filter((tr) => tr.pl_type === 'L').length
    const totalPL = t.reduce((sum, tr) => {
      return sum + (tr.pl_type === 'P' ? Math.abs(tr.amount_pl) : -Math.abs(tr.amount_pl))
    }, 0)
    return {
      total: t.length,
      profits,
      losses,
      winRate: t.length > 0 ? (profits / t.length) * 100 : 0,
      totalPL,
    }
  }, [displayedTrades])

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-zinc-800 border-b border-zinc-800">
        {[
          { label: 'Total Trades', value: overallStats.total.toString(), color: 'text-white' },
          { label: 'Wins', value: overallStats.profits.toString(), color: 'text-emerald-400' },
          { label: 'Losses', value: overallStats.losses.toString(), color: 'text-red-400' },
          { label: 'Win Rate', value: `${overallStats.winRate.toFixed(1)}%`, color: overallStats.winRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Net P/L', value: `${overallStats.totalPL >= 0 ? '+' : ''}$${overallStats.totalPL.toFixed(2)}`, color: overallStats.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-zinc-950 px-4 sm:px-6 py-3 sm:py-4">
            <p className="text-xs text-zinc-500">{stat.label}</p>
            <p className={cn('text-base sm:text-lg font-mono mt-0.5', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800">
        <div className="flex gap-1">
          {(['trades', 'monthly', 'yearly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); setSelectedMonth(null) }}
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
              Clear Filter
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
          <Button size="sm" onClick={() => setFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
            + Log Trade
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}
            className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs">
            Import Excel
          </Button>
        </div>
      </div>

      <main className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <div className="w-3 h-3 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
              Loading trades...
            </div>
          </div>
        ) : viewMode === 'trades' ? (
          /* ---- TRADES TABLE ---- */
          displayedTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <p className="text-lg">No trades logged</p>
              <p className="text-sm mt-1">Click "+ Log Trade" to record your first trade</p>
            </div>
          ) : (
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
                {displayedTrades.map((trade, i) => (
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
                    <td className="py-2.5 px-3 text-xs text-zinc-500 max-w-30 truncate">{trade.comments || '—'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Button variant="ghost" size="sm"
                        onClick={() => { removeTrade(trade.id); toast.success('Trade deleted') }}
                        className="text-zinc-600 hover:text-red-400 hover:bg-transparent text-xs">
                        Del
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : viewMode === 'monthly' ? (
          /* ---- MONTHLY SUMMARY ---- */
          monthlySummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <p className="text-lg">No data yet</p>
            </div>
          ) : (
            <table className="w-full min-w-150">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="text-left py-3 px-4 font-medium">Month</th>
                  <th className="text-right py-3 px-4 font-medium">Trades</th>
                  <th className="text-right py-3 px-4 font-medium">Wins</th>
                  <th className="text-right py-3 px-4 font-medium">Losses</th>
                  <th className="text-right py-3 px-4 font-medium">Win Rate</th>
                  <th className="text-right py-3 px-4 font-medium">Net P/L</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {monthlySummaries.map((s) => (
                  <tr key={s.month} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    <td className="py-3 px-4 text-sm font-medium text-white">{s.label}</td>
                    <td className="py-3 px-4 text-sm text-right text-zinc-300">{s.totalTrades}</td>
                    <td className="py-3 px-4 text-sm text-right text-emerald-400">{s.profits}</td>
                    <td className="py-3 px-4 text-sm text-right text-red-400">{s.losses}</td>
                    <td className={cn('py-3 px-4 text-sm text-right font-mono',
                      s.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>
                      {s.winRate.toFixed(1)}%
                    </td>
                    <td className={cn('py-3 px-4 text-sm text-right font-mono',
                      s.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {s.totalPL >= 0 ? '+' : ''}${s.totalPL.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm"
                        onClick={() => { setSelectedMonth(s.month); setViewMode('trades') }}
                        className="text-zinc-500 hover:text-white text-xs">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          /* ---- YEARLY SUMMARY ---- */
          yearlySummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <p className="text-lg">No data yet</p>
            </div>
          ) : (
            <div className="space-y-6 p-4 sm:p-6">
              {yearlySummaries.map((y) => (
                <div key={y.year} className="border border-zinc-800 rounded-lg overflow-hidden">
                  {/* Year header */}
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
                  {/* Monthly breakdown */}
                  <table className="w-full">
                    <tbody>
                      {y.months.map((m) => (
                        <tr key={m.month} className="border-t border-zinc-800/50 hover:bg-zinc-900/50">
                          <td className="py-2 px-4 text-sm text-zinc-300">{m.label}</td>
                          <td className="py-2 px-4 text-sm text-right text-zinc-400">{m.totalTrades} trades</td>
                          <td className={cn('py-2 px-4 text-sm text-right font-mono',
                            m.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>
                            {m.winRate.toFixed(0)}% WR
                          </td>
                          <td className={cn('py-2 px-4 text-sm text-right font-mono',
                            m.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {m.totalPL >= 0 ? '+' : ''}${m.totalPL.toFixed(2)}
                          </td>
                          <td className="py-2 px-4 text-right">
                            <Button variant="ghost" size="sm"
                              onClick={() => { setSelectedMonth(m.month); setViewMode('trades') }}
                              className="text-zinc-500 hover:text-white text-xs">
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      <TradeFormModal open={formOpen} onClose={() => setFormOpen(false)} onSubmit={addTrade} />
      <ImportTradesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => fetchTrades()}
      />
    </div>
  )
}