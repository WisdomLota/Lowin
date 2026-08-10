import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  })
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch Bybit spot tickers
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=spot')
    if (!res.ok) return NextResponse.json({ error: 'Bybit API failed' }, { status: 500 })

    const data = await res.json()
    if (data.retCode !== 0) return NextResponse.json({ error: 'Bybit error' }, { status: 500 })

    const currentCoins = data.result.list
      .filter((t: any) => {
        const price = parseFloat(t.lastPrice)
        return t.symbol.endsWith('USDT') && price > 0 && price <= 1
      })
      .map((t: any) => ({
        symbol: t.symbol.replace('USDT', ''),
        price: parseFloat(t.lastPrice),
        volume: parseFloat(t.turnover24h),
        change: parseFloat(t.price24hPcnt) * 100,
      }))

    // Get known coins from DB
    const { data: knownCoins } = await supabase.from('known_coins').select('symbol').eq('source', 'bybit')
    const knownSet = new Set((knownCoins || []).map((c: any) => c.symbol))

    // Find new coins
    const newCoins = currentCoins.filter((c: any) => !knownSet.has(c.symbol))

    if (newCoins.length > 0) {
      // Insert new coins into DB
      await supabase.from('known_coins').upsert(
        newCoins.map((c: any) => ({ symbol: c.symbol, source: 'bybit' })),
        { onConflict: 'symbol' }
      )

      // Send Telegram notification
      const lines = newCoins
        .filter((c: any) => c.price <= 1)
        .slice(0, 20)
        .map((c: any) => `• <b>${c.symbol}</b> — $${c.price < 0.01 ? c.price.toFixed(8) : c.price.toFixed(4)} (${c.change >= 0 ? '+' : ''}${c.change.toFixed(1)}%) Vol: $${(c.volume / 1000).toFixed(1)}K`)

      if (lines.length > 0) {
        const message = `🆕 <b>New Bybit Listings (≤$1)</b>\n\n${lines.join('\n')}\n\n🔗 Check Lowin for details`
        await sendTelegram(message)
      }
    }

    return NextResponse.json({
      checked: currentCoins.length,
      newFound: newCoins.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}