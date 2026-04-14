import { NextResponse } from 'next/server'
import { fetchAllCoins } from '@/lib/coins'

export const revalidate = 60 // Cache this route for 60 seconds

export async function GET() {
  try {
    const coins = await fetchAllCoins()

    return NextResponse.json({
      coins,
      updated_at: new Date().toISOString(),
      count: coins.length,
    })
  } catch (error) {
    console.error('Error fetching coins:', error)
    return NextResponse.json(
      { error: 'Failed to fetch coin data' },
      { status: 500 }
    )
  }
}