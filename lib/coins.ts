import { Coin } from '@/types/coin'
import { fetchCoinGeckoCoins } from './coingecko'

export async function fetchAllCoins(): Promise<Coin[]> {
  // Server-side only fetches CoinGecko (works from Vercel)
  // Bybit and Binance are fetched client-side in useCoins hook
  const geckoCoins = await fetchCoinGeckoCoins(1).catch(() => [])
  return geckoCoins
}