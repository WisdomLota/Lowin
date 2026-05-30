import { useQuery } from '@tanstack/react-query'
import { Coin } from '@/types/coin'

interface CoinsResponse {
  coins: Coin[]
  updated_at: string
  count: number
}

// Fetch Bybit directly from browser (bypasses Vercel IP blocks)
async function fetchBybitClient(): Promise<Coin[]> {
  try {
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=spot')
    if (!res.ok) return []

    const data = await res.json()
    if (data.retCode !== 0) return []

    return data.result.list
      .filter((t: any) => {
        const price = parseFloat(t.lastPrice)
        return t.symbol.endsWith('USDT') && price > 0 && price <= 0.01 && parseFloat(t.volume24h) > 0
      })
      .map((t: any): Coin => {
        const symbol = t.symbol.replace('USDT', '')
        return {
          id: `bybit-${symbol.toLowerCase()}`,
          symbol,
          name: symbol,
          image: null,
          current_price: parseFloat(t.lastPrice),
          price_change_percentage_24h: parseFloat(t.price24hPcnt) * 100,
          market_cap: 0,
          total_volume: parseFloat(t.turnover24h),
          circulating_supply: 0,
          market_cap_rank: null,
          source: 'bybit',
        }
      })
  } catch {
    return []
  }
}

// Fetch Binance directly from browser
async function fetchBinanceClient(): Promise<Coin[]> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr')
    if (!res.ok) return []

    const data = await res.json()

    return data
      .filter((t: any) => {
        const price = parseFloat(t.lastPrice)
        return t.symbol.endsWith('USDT') && price > 0 && price <= 0.01 && parseFloat(t.quoteVolume) > 0
      })
      .map((t: any): Coin => {
        const symbol = t.symbol.replace('USDT', '')
        return {
          id: `binance-${symbol.toLowerCase()}`,
          symbol,
          name: symbol,
          image: null,
          current_price: parseFloat(t.lastPrice),
          price_change_percentage_24h: parseFloat(t.priceChangePercent),
          market_cap: 0,
          total_volume: parseFloat(t.quoteVolume),
          circulating_supply: 0,
          market_cap_rank: null,
          source: 'binance' as any,
        }
      })
  } catch {
    return []
  }
}

// Merge all sources: CoinGecko (server) + Bybit + Binance (client)
function mergeCoins(geckoCoins: Coin[], bybitCoins: Coin[], binanceCoins: Coin[]): Coin[] {
  const coinMap = new Map<string, Coin>()

  // CoinGecko first (rich metadata)
  for (const coin of geckoCoins) {
    coinMap.set(coin.symbol, coin)
  }

  // Overlay Bybit prices (more accurate for trading)
  for (const coin of bybitCoins) {
    const existing = coinMap.get(coin.symbol)
    if (existing) {
      existing.current_price = coin.current_price
      existing.price_change_percentage_24h = coin.price_change_percentage_24h
      existing.total_volume = coin.total_volume
    } else {
      coinMap.set(coin.symbol, coin)
    }
  }

  // Add Binance-only coins
  for (const coin of binanceCoins) {
    if (!coinMap.has(coin.symbol)) {
      coinMap.set(coin.symbol, coin)
    }
  }

  return Array.from(coinMap.values())
}

export function useCoins() {
  return useQuery<CoinsResponse>({
    queryKey: ['coins'],
    queryFn: async () => {
      // Fetch CoinGecko from our API route (server-side, cached)
      // Fetch Bybit + Binance directly from browser (no IP blocking)
      const [serverRes, bybitCoins, binanceCoins] = await Promise.all([
        fetch('/api/coins', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ coins: [] })),
        fetchBybitClient(),
        fetchBinanceClient(),
      ])

      const geckoCoins: Coin[] = serverRes.coins || []
      const merged = mergeCoins(geckoCoins, bybitCoins, binanceCoins)

      return {
        coins: merged,
        updated_at: serverRes.updated_at || new Date().toISOString(),
        count: merged.length,
      }
    },
  })
}