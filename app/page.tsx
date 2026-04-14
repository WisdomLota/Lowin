'use client'

import { useState, useMemo } from 'react'
import { useCoins } from '@/hooks/useCoins'
import { Header } from '@/components/layout/header'
import { NavTabs, TabKey, SourceFilter } from '@/components/layout/nav-tabs'
import { CoinTable } from '@/components/coins/coin-table'
import { CoinDetailModal } from '@/components/coins/coin-detail-modal'
import { Coin } from '@/types/coin'

export default function DashboardPage() {
  const { data, isLoading, error } = useCoins()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null)

  const filteredCoins = useMemo(() => {
    if (!data?.coins) return []

    let coins = data.coins

    if (sourceFilter !== 'all') {
      coins = coins.filter((c) => c.source === sourceFilter)
    }

    switch (activeTab) {
      case 'new':
        return [...coins]
          .filter((c) => c.market_cap > 0)
          .sort((a, b) => a.market_cap - b.market_cap)
          .slice(0, 50)
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
  }, [data?.coins, activeTab, sourceFilter])

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <NavTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
      />

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
            <div className="px-6 py-2 flex items-center justify-between">
              <span className="text-xs text-zinc-600">
                {filteredCoins.length} coins
              </span>
              <span className="text-xs text-zinc-600">
                Updated: {new Date(data.updated_at).toLocaleTimeString()}
              </span>
            </div>
            <CoinTable coins={filteredCoins} onCoinClick={setSelectedCoin} />
          </>
        )}
      </main>

      {/* Coin Detail Modal */}
      <CoinDetailModal
        coin={selectedCoin}
        open={!!selectedCoin}
        onClose={() => setSelectedCoin(null)}
      />
    </div>
  )
}