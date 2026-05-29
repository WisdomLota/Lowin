import { Coin } from '@/types/coin'

export async function fetchBybitCoins(): Promise<Coin[]> {
  try {
    // Use v5 with different endpoint structure that's less likely to be blocked
    const res = await fetch(
      'https://api.bybit.com/v5/market/tickers?category=spot',
      {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Lowin/1.0',
          'Accept': 'application/json',
          'Referer': 'https://www.bybit.com',
        },
      }
    )

    if (!res.ok) {
      console.error('Bybit API error:', res.status)

      // Fallback: try alternative Bybit endpoint
      try {
        const fallbackRes = await fetch(
          'https://api.bybit.com/spot/v3/public/quote/ticker/24hr',
          {
            cache: 'no-store',
            headers: {
              'User-Agent': 'Lowin/1.0',
              'Accept': 'application/json',
            },
          }
        )

        if (!fallbackRes.ok) return []

        const fallbackData = await fallbackRes.json()
        if (fallbackData.retCode !== 0 || !fallbackData.result?.list) return []

        return fallbackData.result.list
          .filter((t: any) => {
            const price = parseFloat(t.lp)
            return t.s?.endsWith('USDT') && price > 0 && price <= 0.01
          })
          .map((t: any): Coin => {
            const symbol = t.s.replace('USDT', '')
            return {
              id: `bybit-${symbol.toLowerCase()}`,
              symbol,
              name: symbol,
              image: null,
              current_price: parseFloat(t.lp),
              price_change_percentage_24h: parseFloat(t.cp || '0') * 100,
              market_cap: 0,
              total_volume: parseFloat(t.qv || '0'),
              circulating_supply: 0,
              market_cap_rank: null,
              source: 'bybit',
            }
          })
      } catch {
        return []
      }
    }

    const data = await res.json()

    if (data.retCode !== 0) {
      console.error('Bybit API returned error:', data.retMsg)
      return []
    }

    return data.result.list
      .filter((ticker: any) => {
        const price = parseFloat(ticker.lastPrice)
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
          name: symbol,
          image: null,
          current_price: parseFloat(ticker.lastPrice),
          price_change_percentage_24h: parseFloat(ticker.price24hPcnt) * 100,
          market_cap: 0,
          total_volume: parseFloat(ticker.turnover24h),
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