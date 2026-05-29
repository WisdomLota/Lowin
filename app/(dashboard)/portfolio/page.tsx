'use client'

import { useState, useMemo } from 'react'
import { useWatchlist, usePurchases } from '@/hooks/usePortfolio'
import { useCoins } from '@/hooks/useCoins'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CoinDetailModal } from '@/components/coins/coin-detail-modal'
import { Coin } from '@/types/coin'

type PortfolioTab = 'purchases' | 'watchlist'

function formatPrice(price: number): string {
  if (price === 0) return '$0.00'
  if (price < 0.0000000001) return `$${price.toFixed(14)}`
  if (price < 0.00000001) return `$${price.toFixed(12)}`
  if (price < 0.000001) return `$${price.toFixed(10)}`
  if (price < 0.0001) return `$${price.toFixed(8)}`
  if (price < 0.01) return `$${price.toFixed(6)}`
  return `$${price.toFixed(4)}`
}

function formatUsd(value: number): string {
  if (Math.abs(value) >= 1000) return `$${value.toFixed(2)}`
  if (Math.abs(value) >= 1) return `$${value.toFixed(2)}`
  if (Math.abs(value) >= 0.01) return `$${value.toFixed(4)}` 
  return `$${value.toFixed(6)}`
}

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<PortfolioTab>('purchases')
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null)
  const { items: watchlist, loading: watchlistLoading, remove: removeWatchlist } = useWatchlist()
  const { items: purchases, loading: purchasesLoading, remove: removePurchase, refetch: refetchPurchases } = usePurchases()
  const { data: coinsData } = useCoins()

  // Build a lookup map: symbol → current price
  const priceMap = useMemo(() => {
    const map = new Map<string, number>()
    if (coinsData?.coins) {
      for (const coin of coinsData.coins) {
        map.set(coin.symbol, coin.current_price)
      }
    }
    return map
  }, [coinsData])

  function openWatchlistCoin(item: typeof watchlist[number]) {
    const liveCoin = coinsData?.coins.find((c) => c.symbol === item.coin_symbol)
    if (liveCoin) {
      setSelectedCoin(liveCoin)
    } else {
      // Build a minimal Coin object if live data isn't available
      setSelectedCoin({
        id: item.coin_id,
        symbol: item.coin_symbol,
        name: item.coin_name,
        image: null,
        current_price: 0,
        price_change_percentage_24h: 0,
        market_cap: 0,
        total_volume: 0,
        circulating_supply: 0,
        market_cap_rank: null,
        source: item.source as 'coingecko' | 'bybit',
      })
    }
  }

  function openPurchaseCoin(purchase: typeof purchases[number]) {
    const liveCoin = coinsData?.coins.find((c) => c.symbol === purchase.coin_symbol)
    if (liveCoin) {
      setSelectedCoin(liveCoin)
    } else {
      setSelectedCoin({
        id: purchase.coin_id,
        symbol: purchase.coin_symbol,
        name: purchase.coin_name,
        image: null,
        current_price: priceMap.get(purchase.coin_symbol) || purchase.buy_price,
        price_change_percentage_24h: 0,
        market_cap: 0,
        total_volume: 0,
        circulating_supply: 0,
        market_cap_rank: null,
        source: 'coingecko',
      })
    }
  }

  // Calculate P&L summary
  const summary = useMemo(() => {
    let totalInvested = 0
    let currentValue = 0

    for (const p of purchases) {
      const invested = p.quantity * p.buy_price
      const current = p.quantity * (priceMap.get(p.coin_symbol) || p.buy_price)
      totalInvested += invested
      currentValue += current
    }

    const totalPL = currentValue - totalInvested
    const plPercentage = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0

    return { totalInvested, currentValue, totalPL, plPercentage }
  }, [purchases, priceMap])

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800 border-b border-zinc-800">
        {[
          { label: 'Total Invested', value: formatUsd(summary.totalInvested), color: 'text-white' },
          { label: 'Current Value', value: formatUsd(summary.currentValue), color: 'text-white' },
          {
            label: 'Total P/L',
            value: `${summary.totalPL >= 0 ? '+' : ''}${formatUsd(summary.totalPL)}`,
            color: summary.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400',
          },
          {
            label: 'P/L %',
            value: `${summary.plPercentage >= 0 ? '+' : ''}${summary.plPercentage.toFixed(2)}%`,
            color: summary.plPercentage >= 0 ? 'text-emerald-400' : 'text-red-400',
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-zinc-950 px-4 sm:px-6 py-4">
            <p className="text-xs text-zinc-500">{stat.label}</p>
            <p className={cn('text-lg font-mono mt-0.5', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-800 px-4 sm:px-6">
        {(['purchases', 'watchlist'] as PortfolioTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 capitalize transition-colors',
              activeTab === tab
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Purchases Tab */}
      {activeTab === 'purchases' && (
        <div className="overflow-x-auto">
          {purchasesLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <div className="w-3 h-3 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
                Loading purchases...
              </div>
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <p className="text-lg">No purchases logged</p>
              <p className="text-sm mt-1">Click any coin on the dashboard to log a purchase</p>
            </div>
          ) : (
            <table className="w-full min-w-150">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="text-left py-3 px-4 sm:px-6 font-medium">Coin</th>
                  <th className="text-right py-3 px-2 font-medium">Quantity</th>
                  <th className="text-right py-3 px-2 font-medium">Buy Price</th>
                  <th className="text-right py-3 px-2 font-medium">Current Price</th>
                  <th className="text-right py-3 px-2 font-medium">P&L</th>
                  <th className="text-right py-3 px-2 font-medium">Exchange</th>
                  <th className="text-right py-3 px-2 font-medium">Date</th>
                  <th className="text-right py-3 px-4 sm:px-6 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => {
                  const currentPrice = priceMap.get(purchase.coin_symbol) || purchase.buy_price
                  const invested = purchase.quantity * purchase.buy_price
                  const current = purchase.quantity * currentPrice
                  const pl = current - invested
                  const plPct = invested > 0 ? (pl / invested) * 100 : 0

                  return (
                    <tr key={purchase.id} onClick={() => openPurchaseCoin(purchase)} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 cursor-pointer">
                      <td className="py-3 px-4 sm:px-6">
                        <span className="text-sm font-medium text-white">{purchase.coin_name}</span>
                        <span className="text-xs text-zinc-500 ml-2">{purchase.coin_symbol}</span>
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-mono text-zinc-300">
                        {purchase.quantity.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-mono text-zinc-400">
                        {formatPrice(purchase.buy_price)}
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-mono text-white">
                        {formatPrice(currentPrice)}
                      </td>
                      <td className={cn(
                        'py-3 px-2 text-right text-sm font-mono',
                        pl >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        <div>{pl >= 0 ? '+' : ''}{formatUsd(pl)}</div>
                        <div className="text-xs opacity-70">
                          {plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-xs text-zinc-500 capitalize">
                        {purchase.exchange}
                      </td>
                      <td className="py-3 px-2 text-right text-xs text-zinc-500">
                        {new Date(purchase.purchased_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 sm:px-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            removePurchase(purchase.id)
                            toast.success(`${purchase.coin_symbol} purchase deleted`)
                          }}
                          className="text-zinc-600 hover:text-red-400 hover:bg-transparent text-xs"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Watchlist Tab */}
      {activeTab === 'watchlist' && (
        <div className="overflow-x-auto">
          {watchlistLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <div className="w-3 h-3 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
                Loading watchlist...
              </div>
            </div>
          ) : watchlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <p className="text-lg">Watchlist is empty</p>
              <p className="text-sm mt-1">Add coins from the dashboard to track them here</p>
            </div>
          ) : (
            <table className="w-full min-w-137.5">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="text-left py-3 px-4 sm:px-6 font-medium">Coin</th>
                  <th className="text-right py-3 px-2 font-medium">Current Price</th>
                  <th className="text-right py-3 px-2 font-medium">24h %</th>
                  <th className="text-right py-3 px-2 font-medium">Source</th>
                  <th className="text-right py-3 px-2 font-medium">Added</th>
                  <th className="text-left py-3 px-2 font-medium">Note</th>
                  <th className="text-right py-3 px-4 sm:px-6 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((item) => {
                  // Find matching coin from live data
                  const liveCoin = coinsData?.coins.find(
                    (c) => c.symbol === item.coin_symbol
                  )
                  return (
                    <tr key={item.id} onClick={() => openWatchlistCoin(item)} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 cursor-pointer">
                      <td className="py-3 px-4 sm:px-6">
                        <span className="text-sm font-medium text-white">{item.coin_name}</span>
                        <span className="text-xs text-zinc-500 ml-2">{item.coin_symbol}</span>
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-mono text-white">
                        {liveCoin ? formatPrice(liveCoin.current_price) : '—'}
                      </td>
                      <td className={cn(
                        'py-3 px-2 text-right text-sm font-mono',
                        liveCoin && liveCoin.price_change_percentage_24h >= 0
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      )}>
                        {liveCoin
                          ? `${liveCoin.price_change_percentage_24h >= 0 ? '+' : ''}${liveCoin.price_change_percentage_24h.toFixed(2)}%`
                          : '—'}
                      </td>
                      <td className="py-3 px-2 text-right text-xs text-zinc-500 capitalize">
                        {item.source}
                      </td>
                      <td className="py-3 px-2 text-right text-xs text-zinc-500">
                        {new Date(item.added_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-xs text-zinc-500 max-w-50 truncate">
                        {item.comment || '—'}
                      </td>
                      <td className="py-3 px-4 sm:px-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            removeWatchlist(item.id)
                            toast.success(`${item.coin_symbol} removed from watchlist`)
                          }}
                          className="text-zinc-600 hover:text-red-400 hover:bg-transparent text-xs"
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <CoinDetailModal
        coin={selectedCoin}
        open={!!selectedCoin}
        onClose={() => setSelectedCoin(null)}
      />
    </div>
  )
}