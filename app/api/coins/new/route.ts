import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Get coins first seen in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('known_coins')
      .select('symbol, source, first_seen_at')
      .gte('first_seen_at', sevenDaysAgo)
      .order('first_seen_at', { ascending: false })

    if (error) {
      return NextResponse.json({ coins: [] })
    }

    return NextResponse.json({ coins: data || [] })
  } catch {
    return NextResponse.json({ coins: [] })
  }
}