import { NextRequest, NextResponse } from 'next/server'
import { fetchCoinGeckoPriceHistory } from '@/lib/price-history'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const symbol = request.nextUrl.searchParams.get('symbol') || ''

  try {
    // Always try CoinGecko first (works from server)
    let prices = await fetchCoinGeckoPriceHistory(id)

    // If no data and it's a Bybit/Binance coin, try searching CoinGecko by symbol
    if (prices.length === 0 && id.startsWith('bybit-') || id.startsWith('binance-')) {
      try {
        const searchRes = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${symbol.toLowerCase()}`,
          { headers: { 'Accept': 'application/json' } }
        )
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          const match = searchData.coins?.find((c: any) => c.symbol?.toUpperCase() === symbol)
          if (match) {
            prices = await fetchCoinGeckoPriceHistory(match.id)
          }
        }
      } catch {}
    }

    return NextResponse.json({ prices })
  } catch {
    return NextResponse.json({ prices: [] }, { status: 500 })
  }
}