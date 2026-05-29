import { NextResponse } from 'next/server'
import { fetchAllCoins } from '@/lib/coins'
import { Coin } from '@/types/coin'

// In-memory cache to avoid hammering APIs
let cachedCoins: Coin[] = []
let lastFetchTime = 0
const CACHE_DURATION = 90 * 1000 // 90 seconds

export async function GET() {
  try {
    const now = Date.now()

    // Return cached data if fresh enough
    if (cachedCoins.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
      return NextResponse.json({
        coins: cachedCoins,
        updated_at: new Date(lastFetchTime).toISOString(),
        count: cachedCoins.length,
        cached: true,
      })
    }

    // Fetch fresh data
    const coins = await fetchAllCoins()

    // Only update cache if we got results (don't cache empty responses from API failures)
    if (coins.length > 0) {
      cachedCoins = coins
      lastFetchTime = now
    }

    // Return fresh data if available, otherwise return stale cache
    const returnCoins = coins.length > 0 ? coins : cachedCoins

    return NextResponse.json({
      coins: returnCoins,
      updated_at: new Date(returnCoins === cachedCoins ? lastFetchTime : now).toISOString(),
      count: returnCoins.length,
      cached: coins.length === 0 && cachedCoins.length > 0,
    })
  } catch (error) {
    console.error('Error fetching coins:', error)

    // Return stale cache on error rather than failing
    if (cachedCoins.length > 0) {
      return NextResponse.json({
        coins: cachedCoins,
        updated_at: new Date(lastFetchTime).toISOString(),
        count: cachedCoins.length,
        cached: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch coin data', coins: [], count: 0 },
      { status: 500 }
    )
  }
}