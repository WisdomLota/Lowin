import { Coin } from '@/types/coin'

const BASE_URL = 'https://api.coingecko.com/api/v3'

// CoinGecko free tier: ~10-30 calls/min
// We fetch coins sorted by market cap, then filter to ≤ $0.01 client-side
// because CoinGecko doesn't have a direct price filter
export async function fetchCoinGeckoCoins(page = 1): Promise<Coin[]> {
  const res = await fetch(
    `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_asc&per_page=250&page=${page}&sparkline=false&price_change_percentage=24h`,
    { cache: 'no-store' }
  )

  if (!res.ok) {
    console.error('CoinGecko API error:', res.status)
    return []
  }

  const data = await res.json()

  return data
    .filter((coin: any) => coin.current_price !== null && coin.current_price <= 0.01 && coin.current_price > 0)
    .map((coin: any): Coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      current_price: coin.current_price,
      price_change_percentage_24h: coin.price_change_percentage_24h ?? 0,
      market_cap: coin.market_cap ?? 0,
      total_volume: coin.total_volume ?? 0,
      circulating_supply: coin.circulating_supply ?? 0,
      market_cap_rank: coin.market_cap_rank,
      source: 'coingecko',
    }))
}


// Fetch specific coins by ID (for portfolio/watchlist price lookups)
// This isn't limited to ≤ $0.01
export async function fetchCoinPricesBySymbols(symbols: string[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>()
  if (symbols.length === 0) return priceMap

  try {
    // Use CoinGecko simple/price endpoint with symbol search
    // First we need to find coin IDs from symbols
    const searchPromises = symbols.slice(0, 10).map(async (symbol) => {
      try {
        const res = await fetch(
          `${BASE_URL}/search?query=${symbol.toLowerCase()}`,
          {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
          }
        )
        if (!res.ok) return null
        const data = await res.json()
        const match = data.coins?.find((c: any) => c.symbol?.toUpperCase() === symbol)
        return match ? { symbol, id: match.id } : null
      } catch {
        return null
      }
    })

    const results = await Promise.all(searchPromises)
    const coinIds = results.filter(Boolean) as { symbol: string; id: string }[]

    if (coinIds.length === 0) return priceMap

    // Fetch prices for found IDs
    const ids = coinIds.map((c) => c.id).join(',')
    const res = await fetch(
      `${BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      }
    )

    if (!res.ok) return priceMap
    const prices = await res.json()

    for (const coin of coinIds) {
      if (prices[coin.id]?.usd) {
        priceMap.set(coin.symbol, prices[coin.id].usd)
      }
    }
  } catch (error) {
    console.error('CoinGecko price lookup error:', error)
  }

  return priceMap
}