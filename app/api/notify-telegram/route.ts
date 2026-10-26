import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient as createClient } from '@/lib/supabase-server'
import { sendTelegram } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await request.json()
  if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

  const ok = await sendTelegram(message)
  if (!ok) return NextResponse.json({ error: 'Failed to send' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
