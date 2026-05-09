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

  // Overlay Bybit prices on matching coins (more accurate for trading)
  // Add Bybit-only coins as new entries
  for (const coin of bybitCoins) {
    const existing = coinMap.get(coin.symbol)
    if (existing) {
      // Keep CoinGecko metadata but use Bybit's price and volume
      existing.current_price = coin.current_price
      existing.price_change_percentage_24h = coin.price_change_percentage_24h
      existing.total_volume = coin.total_volume
    } else {
      coinMap.set(coin.symbol, coin)
    }
  }
  return Array.from(coinMap.values())
}