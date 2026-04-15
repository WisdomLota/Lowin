'use client'

import { useState, useMemo } from 'react'
import { useCoins } from '@/hooks/useCoins'
import { Header } from '@/components/layout/header'
import { NavTabs, TabKey, SourceFilter } from '@/components/layout/nav-tabs'
import { CoinTable } from '@/components/coins/coin-table'
import { CoinDetailModal } from '@/components/coins/coin-detail-modal'
import { Coin } from '@/types/coin'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 50

export default function DashboardPage() {
  const { data, isLoading, error } = useCoins()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Reset page when filters change
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    setPage(1)
  }
  const handleSourceChange = (source: SourceFilter) => {
    setSourceFilter(source)
    setPage(1)
  }
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const filteredCoins = useMemo(() => {
    if (!data?.coins) return []

    let coins = data.coins

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      coins = coins.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q)
      )
    }

    // Source filter
    if (sourceFilter !== 'all') {
      coins = coins.filter((c) => c.source === sourceFilter)
    }

    // Tab sorting
    switch (activeTab) {
      case 'new':
        return [...coins]
          .filter((c) => c.market_cap > 0)
          .sort((a, b) => a.market_cap - b.market_cap)
      case 'gainers':
        return [...coins]
          .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
          .filter((c) => c.price_change_percentage_24h > 0)
      case 'losers':
        return [...coins]
          .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
          .filter((c) => c.price_change_percentage_24h < 0)
      case 'volume':
        return [...coins].sort((a, b) => b.total_volume - a.total_volume)
      case 'turnover':
        return [...coins]
          .filter((c) => c.market_cap > 0)
          .sort((a, b) => {
            const turnoverA = a.total_volume / a.market_cap
            const turnoverB = b.total_volume / b.market_cap
            return turnoverB - turnoverA
          })
      default:
        return coins
    }
  }, [data?.coins, activeTab, sourceFilter, search])

  // Pagination
  const totalPages = Math.ceil(filteredCoins.length / PAGE_SIZE)
  const paginatedCoins = filteredCoins.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <NavTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        sourceFilter={sourceFilter}
        onSourceChange={handleSourceChange}
      />

      {/* Search Bar */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <Input
          placeholder="Search by name or symbol..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
        />
      </div>

      <main>
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-sm">Loading coins...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-red-400">
            <p className="text-lg">Failed to load data</p>
            <p className="text-sm mt-1 text-zinc-500">
              Check your connection and try refreshing
            </p>
          </div>
        )}

        {data && (
          <>
            <div className="px-4 sm:px-6 py-2 flex items-center justify-between">
              <span className="text-xs text-zinc-600">
                {filteredCoins.length} coins · Page {page} of {totalPages || 1}
              </span>
              <span className="text-xs text-zinc-600">
                Updated: {new Date(data.updated_at).toLocaleTimeString()}
              </span>
            </div>
            <CoinTable coins={paginatedCoins} onCoinClick={setSelectedCoin} />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                >
                  Previous
                </Button>
                <span className="text-sm text-zinc-500 px-3">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <CoinDetailModal
        coin={selectedCoin}
        open={!!selectedCoin}
        onClose={() => setSelectedCoin(null)}
      />
    </div>
  )
}