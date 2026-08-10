'use client'

import { cn } from '@/lib/utils'

export type TabKey = 'all' | 'new' | 'gainers' | 'losers' | 'volume' | 'turnover'
export type SourceFilter = 'all' | 'coingecko' | 'bybit' | 'binance'
export type MarketFilter = 'all' | 'spot' | 'perpetual'
export type PriceFilter = '0.01' | '0.1' | '0.5' | '1'

interface NavTabsProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  sourceFilter: SourceFilter
  onSourceChange: (source: SourceFilter) => void
  marketFilter: MarketFilter
  onMarketChange: (market: MarketFilter) => void
  priceFilter: PriceFilter
  onPriceChange: (price: PriceFilter) => void
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'gainers', label: 'Gainers' },
  { key: 'losers', label: 'Losers' },
  { key: 'volume', label: 'Volume' },
  { key: 'turnover', label: 'Turnover' },
]

const markets: { key: MarketFilter; label: string }[] = [
  { key: 'all', label: 'All Markets' },
  { key: 'spot', label: 'Spot' },
  { key: 'perpetual', label: 'Perps' },
]

const pricePresets: { key: PriceFilter; label: string }[] = [
  { key: '0.01', label: '≤$0.01' },
  { key: '0.1', label: '≤$0.10' },
  { key: '0.5', label: '≤$0.50' },
  { key: '1', label: '≤$1.00' },
]

const sources: { key: SourceFilter; label: string }[] = [
  { key: 'all', label: 'All Sources' },
  { key: 'coingecko', label: 'CoinGecko' },
  { key: 'bybit', label: 'Bybit' },
  { key: 'binance', label: 'Binance' },
]

export function NavTabs({ activeTab, onTabChange, sourceFilter, onSourceChange, marketFilter, onMarketChange, priceFilter, onPriceChange }: NavTabsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#874708]/20 px-4 sm:px-6 gap-2 py-2 sm:py-0">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'px-3 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap',
              activeTab === tab.key
                ? 'border-[#FF8D19] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex gap-3 overflow-x-auto">
        <div className="flex gap-0.5 bg-[#2a1a00]/50 rounded p-0.5">
          {markets.map((m) => (
            <button
              key={m.key}
              onClick={() => onMarketChange(m.key)}
              className={cn(
                'px-2.5 py-1 text-xs rounded font-medium transition-colors whitespace-nowrap',
                marketFilter === m.key
                  ? 'bg-[#FF8D19] text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 bg-[#2a1a00]/50 rounded p-0.5">
          {pricePresets.map((p) => (
            <button
              key={p.key}
              onClick={() => onPriceChange(p.key)}
              className={cn(
                'px-2 py-1 text-xs rounded font-medium transition-colors whitespace-nowrap',
                priceFilter === p.key
                  ? 'bg-[#874708] text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {sources.map((source) => (
            <button
              key={source.key}
              onClick={() => onSourceChange(source.key)}
              className={cn(
                'px-2.5 py-1.5 text-xs rounded font-medium transition-colors whitespace-nowrap',
                sourceFilter === source.key
                  ? 'bg-[#2a1a00] text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {source.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}