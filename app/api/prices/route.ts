import { NextRequest, NextResponse } from 'next/server'
import { fetchCoinPricesBySymbols } from '@/lib/coingecko'

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get('symbols')

  if (!symbols) {
    return NextResponse.json({ prices: {} })
  }

  try {
    const symbolList = symbols.split(',').map((s) => s.trim().toUpperCase())
    const priceMap = await fetchCoinPricesBySymbols(symbolList)

    const prices: Record<string, number> = {}
    for (const [symbol, price] of priceMap) {
      prices[symbol] = price
    }

    return NextResponse.json({ prices })
  } catch {
    return NextResponse.json({ prices: {} })
  }
}