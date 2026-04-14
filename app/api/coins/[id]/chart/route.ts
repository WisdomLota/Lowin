import { NextRequest, NextResponse } from 'next/server'
import { fetchCoinGeckoPriceHistory, fetchBybitPriceHistory } from '@/lib/price-history'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const source = request.nextUrl.searchParams.get('source') || 'coingecko'
  const symbol = request.nextUrl.searchParams.get('symbol') || ''

  try {
    let prices

    if (source === 'bybit') {
      prices = await fetchBybitPriceHistory(symbol)
    } else {
      prices = await fetchCoinGeckoPriceHistory(id)
    }

    return NextResponse.json({ prices })
  } catch {
    return NextResponse.json({ prices: [] }, { status: 500 })
  }
}