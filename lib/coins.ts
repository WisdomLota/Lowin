import { Coin } from '@/types/coin'
import { fetchCoinGeckoCoins } from './coingecko'
import { fetchBybitCoins } from './bybit'

export async function fetchAllCoins(): Promise<Coin[]> {
  // Fetch from both sources in parallel
  const [geckoCoins, bybitCoins] = await Promise.all([
    fetchCoinGeckoCoins(1),
    fetchBybitCoins(),
  ])

  // Merge: if a coin exists on both, prefer CoinGecko (richer data)
  // but mark it as available on both
  const coinMap = new Map<string, Coin>()

  // Add CoinGecko coins first (they have better metadata)
  for (const coin of geckoCoins) {
    coinMap.set(coin.symbol, coin)
  }

  // Add Bybit-only coins (skip duplicates)
  for (const coin of bybitCoins) {
    if (!coinMap.has(coin.symbol)) {
      coinMap.set(coin.symbol, coin)
    }
  }

  return Array.from(coinMap.values())
}