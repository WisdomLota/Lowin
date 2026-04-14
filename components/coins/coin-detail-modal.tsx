'use client'

import { useEffect, useState } from 'react'
import { Coin } from '@/types/coin'
import { PriceChart } from './price-chart'
import { PurchaseFormModal } from '@/components/portfolio/purchase-form-modal'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PricePoint {
  time: number
  value: number
}

interface CoinDetailModalProps {
  coin: Coin | null
  open: boolean
  onClose: () => void
}

function formatPrice(price: number): string {
  if (price < 0.000001) return `$${price.toExponential(2)}`
  if (price < 0.0001) return `$${price.toFixed(8)}`
  if (price < 0.01) return `$${price.toFixed(6)}`
  return `$${price.toFixed(4)}`
}

function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`
  if (num > 0) return `$${num.toFixed(2)}`
  return '—'
}

export function CoinDetailModal({ coin, open, onClose }: CoinDetailModalProps) {
  const [chartData, setChartData] = useState<PricePoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [isWatchlisted, setIsWatchlisted] = useState(false)
  const [purchaseOpen, setPurchaseOpen] = useState(false)

  useEffect(() => {
    if (!coin || !open) return

    setChartLoading(true)
    setChartData([])

    const params = new URLSearchParams({
      source: coin.source,
      symbol: coin.symbol,
    })

    fetch(`/api/coins/${coin.id}/chart?${params}`)
      .then((res) => res.json())
      .then((data) => setChartData(data.prices || []))
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false))
  }, [coin, open])

  useEffect(() => {
    if (!coin || !open) return

    const supabase = createClient()
    supabase
      .from('watchlist')
      .select('id')
      .eq('coin_id', coin.id)
      .maybeSingle()
      .then(({ data }) => setIsWatchlisted(!!data))
  }, [coin, open])

  async function handleWatchlist() {
    if (!coin) return
    setWatchlistLoading(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setWatchlistLoading(false)
      return
    }

    if (isWatchlisted) {
      await supabase.from('watchlist').delete().eq('coin_id', coin.id).eq('user_id', user.id)
      setIsWatchlisted(false)
      toast.success(`${coin.symbol} removed from watchlist`)
    } else {
      await supabase.from('watchlist').insert({
        user_id: user.id,
        coin_id: coin.id,
        coin_symbol: coin.symbol,
        coin_name: coin.name,
        source: coin.source,
      })
      setIsWatchlisted(true)
      toast.success(`${coin.symbol} added to watchlist`)
    }

    setWatchlistLoading(false)
  }

  if (!coin) return null

  const coingeckoUrl =
    coin.source === 'coingecko' ? `https://www.coingecko.com/en/coins/${coin.id}` : null
  const bybitUrl = `https://www.bybit.com/trade/spot/${coin.symbol}/USDT`

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-4xl! p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-3">
            <div className="flex items-center gap-3">
              {coin.image ? (
                <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm text-zinc-500">
                  {coin.symbol.charAt(0)}
                </div>
              )}
              <div>
                <DialogTitle className="text-xl font-semibold text-white">
                  {coin.name}
                  <span className="text-zinc-500 font-normal ml-2 text-sm">{coin.symbol}</span>
                </DialogTitle>
              </div>
            </div>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-3xl font-mono font-semibold">
                {formatPrice(coin.current_price)}
              </span>
              <span
                className={cn(
                  'text-sm font-mono',
                  coin.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                {coin.price_change_percentage_24h.toFixed(2)}%
              </span>
            </div>
          </DialogHeader>

          {/* Chart */}
          <div className="px-6">
            <PriceChart data={chartData} isLoading={chartLoading} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-px bg-zinc-800 mx-6 mt-4 rounded-lg overflow-hidden">
            {[
              { label: 'Market Cap', value: formatCompact(coin.market_cap) },
              { label: '24h Volume', value: formatCompact(coin.total_volume) },
              {
                label: 'Circulating Supply',
                value:
                  coin.circulating_supply > 0
                    ? `${(coin.circulating_supply / 1_000_000).toFixed(2)}M`
                    : '—',
              },
              { label: 'MC Rank', value: coin.market_cap_rank ? `#${coin.market_cap_rank}` : '—' },
            ].map((stat) => (
              <div key={stat.label} className="bg-zinc-900 px-4 py-3">
                <p className="text-xs text-zinc-500">{stat.label}</p>
                <p className="text-sm font-mono text-zinc-200 mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-5 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleWatchlist}
              disabled={watchlistLoading}
              className={cn(
                isWatchlisted
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              {watchlistLoading
                ? '...'
                : isWatchlisted
                  ? 'Remove from Watchlist'
                  : 'Add to Watchlist'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/10"
              onClick={() => setPurchaseOpen(true)}
            >
              Log Purchase
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => window.open(bybitUrl, '_blank')}
            >
              View on Bybit
            </Button>
            {coingeckoUrl && (
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => window.open(coingeckoUrl, '_blank')}
              >
                View on CoinGecko
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PurchaseFormModal
        coin={coin}
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        onSuccess={() => toast.success(`Purchase logged for ${coin.symbol}`)}
      />
    </>
  )
}