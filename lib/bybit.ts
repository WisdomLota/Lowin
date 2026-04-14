import { Coin } from '@/types/coin'

const BASE_URL = 'https://api.bybit.com/v5'

export async function fetchBybitCoins(): Promise<Coin[]> {
  try {
    // Fetch all USDT spot tickers from Bybit
    const res = await fetch(
      `${BASE_URL}/market/tickers?category=spot`,
      { next: { revalidate: 60 } }
    )

    if (!res.ok) {
      console.error('Bybit API error:', res.status)
      return []
    }

    const data = await res.json()

    if (data.retCode !== 0) {
      console.error('Bybit API returned error:', data.retMsg)
      return []
    }

    return data.result.list
      .filter((ticker: any) => {
        const price = parseFloat(ticker.lastPrice)
        // Only USDT pairs, priced ≤ $0.01, with some volume
        return (
          ticker.symbol.endsWith('USDT') &&
          price > 0 &&
          price <= 0.01 &&
          parseFloat(ticker.volume24h) > 0
        )
      })
      .map((ticker: any): Coin => {
        const symbol = ticker.symbol.replace('USDT', '')
        return {
          id: `bybit-${symbol.toLowerCase()}`,
          symbol: symbol,
          name: symbol, // Bybit doesn't return full names in ticker endpoint
          image: null,
          current_price: parseFloat(ticker.lastPrice),
          price_change_percentage_24h: parseFloat(ticker.price24hPcnt) * 100,
          market_cap: 0, // Bybit doesn't provide market cap
          total_volume: parseFloat(ticker.turnover24h), // in USDT
          circulating_supply: 0,
          market_cap_rank: null,
          source: 'bybit',
        }
      })
  } catch (error) {
    console.error('Bybit fetch error:', error)
    return []
  }
}