interface PricePoint {
  time: number // Unix timestamp in seconds
  value: number
}

// CoinGecko: 7-day chart for coins that have a CoinGecko ID
export async function fetchCoinGeckoPriceHistory(coinId: string): Promise<PricePoint[]> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`,
      { next: { revalidate: 300 } } // Cache 5 minutes
    )

    if (!res.ok) return []

    const data = await res.json()

    // CoinGecko returns [timestamp_ms, price] pairs
    return data.prices.map(([timestamp, price]: [number, number]) => ({
      time: Math.floor(timestamp / 1000),
      value: price,
    }))
  } catch {
    return []
  }
}

// Bybit: 7-day kline data for Bybit-sourced coins
export async function fetchBybitPriceHistory(symbol: string): Promise<PricePoint[]> {
  try {
    const end = Date.now()
    const start = end - 7 * 24 * 60 * 60 * 1000 // 7 days ago

    const res = await fetch(
      `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}USDT&interval=60&start=${start}&end=${end}&limit=168`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) return []

    const data = await res.json()
    if (data.retCode !== 0) return []

    // Bybit kline returns [startTime, open, high, low, close, volume, turnover]
    // Results come newest-first, so we reverse
    return data.result.list
      .map((k: string[]) => ({
        time: Math.floor(parseInt(k[0]) / 1000),
        value: parseFloat(k[4]), // close price
      }))
      .reverse()
  } catch {
    return []
  }
}