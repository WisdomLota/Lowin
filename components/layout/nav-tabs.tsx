'use client'

import { cn } from '@/lib/utils'

export type TabKey = 'all' | 'new' | 'gainers' | 'losers' | 'volume' | 'turnover'
export type SourceFilter = 'all' | 'coingecko' | 'bybit'

interface NavTabsProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  sourceFilter: SourceFilter
  onSourceChange: (source: SourceFilter) => void
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'gainers', label: 'Gainers' },
  { key: 'losers', label: 'Losers' },
  { key: 'volume', label: 'Volume' },
  { key: 'turnover', label: 'Turnover' },
]

const sources: { key: SourceFilter; label: string }[] = [
  { key: 'all', label: 'All Sources' },
  { key: 'coingecko', label: 'CoinGecko' },
  { key: 'bybit', label: 'Bybit' },
]

export function NavTabs({ activeTab, onTabChange, sourceFilter, onSourceChange }: NavTabsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 px-4 sm:px-6 gap-2 py-2 sm:py-0">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'px-3 py-2.5 text-sm font-medium transition-colors border-b-2',
              activeTab === tab.key
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {sources.map((source) => (
          <button
            key={source.key}
            onClick={() => onSourceChange(source.key)}
            className={cn(
              'px-2.5 py-1.5 text-xs rounded font-medium transition-colors',
              sourceFilter === source.key
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {source.label}
          </button>
        ))}
      </div>
    </div>
  )
}