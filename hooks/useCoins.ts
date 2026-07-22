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
          market: 'spot',
        }
      })
  } catch {
    return []
  }
}

// Fetch Bybit perpetuals from browser
async function fetchBybitPerpsClient(): Promise<Coin[]> {
  try {
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear')
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
          id: `bybit-perp-${symbol.toLowerCase()}`,
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
          market: 'perpetual',
        }
      })
  } catch {
    return []
  }
}

// Fetch Binance perpetuals from browser
async function fetchBinancePerpsClient(): Promise<Coin[]> {
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr')
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
          id: `binance-perp-${symbol.toLowerCase()}`,
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
          market: 'perpetual',
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
          market: 'spot',
        }
      })
  } catch {
    return []
  }
}

// Merge all sources: CoinGecko (server) + Bybit + Binance (client)
function mergeCoins(geckoCoins: Coin[], bybitCoins: Coin[], binanceCoins: Coin[], bybitPerps: Coin[], binancePerps: Coin[]): Coin[] {
  const coinMap = new Map<string, Coin>()

  // CoinGecko first (rich metadata, spot only)
  for (const coin of geckoCoins) {
    coin.market = 'spot'
    coinMap.set(`${coin.symbol}-spot`, coin)
  }

  // Overlay Bybit spot prices
  for (const coin of bybitCoins) {
    const key = `${coin.symbol}-spot`
    const existing = coinMap.get(key)
    if (existing) {
      existing.current_price = coin.current_price
      existing.price_change_percentage_24h = coin.price_change_percentage_24h
      existing.total_volume = coin.total_volume
    } else {
      coinMap.set(key, coin)
    }
  }

  // Add Binance spot-only coins
  for (const coin of binanceCoins) {
    const key = `${coin.symbol}-spot`
    if (!coinMap.has(key)) {
      coinMap.set(key, coin)
    }
  }

  // Add Bybit perpetuals (separate entries from spot)
  for (const coin of bybitPerps) {
    const key = `${coin.symbol}-perp`
    coinMap.set(key, coin)
  }

  // Add Binance perpetuals (don't overwrite Bybit perps)
  for (const coin of binancePerps) {
    const key = `${coin.symbol}-perp`
    if (!coinMap.has(key)) {
      coinMap.set(key, coin)
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
      const [serverRes, bybitCoins, binanceCoins, bybitPerps, binancePerps] = await Promise.all([
        fetch('/api/coins', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ coins: [] })),
        fetchBybitClient(),
        fetchBinanceClient(),
        fetchBybitPerpsClient(),
        fetchBinancePerpsClient(),
      ])

      const geckoCoins: Coin[] = serverRes.coins || []
      const merged = mergeCoins(geckoCoins, bybitCoins, binanceCoins, bybitPerps, binancePerps)

      return {
        coins: merged,
        updated_at: serverRes.updated_at || new Date().toISOString(),
        count: merged.length,
      }
    },
  })
}