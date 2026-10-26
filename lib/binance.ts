import { Coin, BinanceTicker } from '@/types/coin'

export async function fetchBinanceCoins(): Promise<Coin[]> {
  try {
    const res = await fetch(
      'https://api.binance.com/api/v3/ticker/24hr',
      { cache: 'no-store' }
    )

    if (!res.ok) return []

    const data: BinanceTicker[] = await res.json()

    return data
      .filter((ticker) => {
        const price = parseFloat(ticker.lastPrice)
        return (
          ticker.symbol.endsWith('USDT') &&
          price > 0 &&
          price <= 0.01 &&
          parseFloat(ticker.quoteVolume) > 0
        )
      })
      .map((ticker): Coin => {
        const symbol = ticker.symbol.replace('USDT', '')
        return {
          id: `binance-${symbol.toLowerCase()}`,
          symbol,
          name: symbol,
          image: null,
          current_price: parseFloat(ticker.lastPrice),
          price_change_percentage_24h: parseFloat(ticker.priceChangePercent),
          market_cap: 0,
          total_volume: parseFloat(ticker.quoteVolume),
          circulating_supply: 0,
          market_cap_rank: null,
          source: 'binance',
        }
      })
  } catch {
    return []
  }
}