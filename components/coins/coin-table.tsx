'use client'

import { Coin } from '@/types/coin'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface CoinTableProps {
  coins: Coin[]
  onCoinClick: (coin: Coin) => void
}

// Format large numbers into readable strings (e.g., 1.2M, 340K)
function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`
  return `$${num.toFixed(2)}`
}

// Format price with enough decimal places to be meaningful for sub-penny coins
function formatPrice(price: number): string {
  if (price < 0.000001) return `$${price.toExponential(2)}`
  if (price < 0.0001) return `$${price.toFixed(8)}`
  if (price < 0.01) return `$${price.toFixed(6)}`
  return `$${price.toFixed(4)}`
}

export function CoinTable({ coins, onCoinClick }: CoinTableProps) {
  if (coins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p className="text-lg">No coins found</p>
        <p className="text-sm mt-1">Try a different tab or source filter</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-175">
        <thead>
          <tr className="text-xs text-zinc-500 border-b border-zinc-800">
            <th className="text-left py-3 px-6 font-medium">#</th>
            <th className="text-left py-3 px-2 font-medium">Coin</th>
            <th className="text-right py-3 px-2 font-medium">Price</th>
            <th className="text-right py-3 px-2 font-medium">24h %</th>
            <th className="text-right py-3 px-2 font-medium">Market Cap</th>
            <th className="text-right py-3 px-2 font-medium">Volume (24h)</th>
            <th className="text-right py-3 px-6 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin, index) => (
            <tr
              key={coin.id}
              onClick={() => onCoinClick(coin)}
              className="border-b border-zinc-800/50 hover:bg-zinc-900/50 cursor-pointer transition-colors"
            >
              <td className="py-3 px-6 text-sm text-zinc-500">{index + 1}</td>
              <td className="py-3 px-2">
                <div className="flex items-center gap-2.5">
                  {coin.image ? (
                    <img
                      src={coin.image}
                      alt={coin.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                      {coin.symbol.charAt(0)}
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-white">
                      {coin.name}
                    </span>
                    <span className="text-xs text-zinc-500 ml-2">
                      {coin.symbol}
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-2 text-right text-sm font-mono text-white">
                {formatPrice(coin.current_price)}
              </td>
              <td
                className={cn(
                  'py-3 px-2 text-right text-sm font-mono',
                  coin.price_change_percentage_24h >= 0
                    ? 'text-emerald-400'
                    : 'text-red-400'
                )}
              >
                {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                {coin.price_change_percentage_24h.toFixed(2)}%
              </td>
              <td className="py-3 px-2 text-right text-sm text-zinc-400">
                {coin.market_cap > 0 ? formatCompact(coin.market_cap) : '—'}
              </td>
              <td className="py-3 px-2 text-right text-sm text-zinc-400">
                {coin.total_volume > 0 ? formatCompact(coin.total_volume) : '—'}
              </td>
              <td className="py-3 px-6 text-right">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-normal',
                    coin.source === 'coingecko'
                      ? 'border-orange-500/30 text-orange-400'
                      : 'border-yellow-500/30 text-yellow-400'
                  )}
                >
                  {coin.source === 'coingecko' ? 'CG' : 'BB'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}