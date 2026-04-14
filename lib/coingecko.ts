import { Coin } from '@/types/coin'

const BASE_URL = 'https://api.coingecko.com/api/v3'

// CoinGecko free tier: ~10-30 calls/min
// We fetch coins sorted by market cap, then filter to ≤ $0.01 client-side
// because CoinGecko doesn't have a direct price filter
export async function fetchCoinGeckoCoins(page = 1): Promise<Coin[]> {
  const res = await fetch(
    `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_asc&per_page=250&page=${page}&sparkline=false&price_change_percentage=24h`,
    { next: { revalidate: 60 } } // Cache for 60 seconds
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