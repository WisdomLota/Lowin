import { NextResponse } from 'next/server'
import { fetchAllCoins } from '@/lib/coins'

// Cached at the CDN instead of in memory (serverless instances don't share memory).
// Fresh for 90s, then served stale for up to 5 minutes while it refreshes in the background.
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=90, stale-while-revalidate=300',
}

export async function GET() {
  try {
    const coins = await fetchAllCoins()

    // Don't let the CDN cache an empty result from API failures
    if (coins.length === 0) {
      return NextResponse.json(
        { coins: [], updated_at: new Date().toISOString(), count: 0 },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      { coins, updated_at: new Date().toISOString(), count: coins.length },
      { headers: CACHE_HEADERS }
    )
  } catch (error) {
    console.error('Error fetching coins:', error)
    return NextResponse.json(
      { error: 'Failed to fetch coin data', coins: [], count: 0 },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
