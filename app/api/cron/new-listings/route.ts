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
    // Fetch from both Binance and CoinGecko (Bybit blocks Vercel IPs)
    const [binanceRes, geckoRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/24hr', {
        headers: { 'Accept': 'application/json' },
      }).catch(() => null),
      fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_asc&per_page=250&page=1&sparkline=false', {
        headers: { 'Accept': 'application/json' },
      }).catch(() => null),
    ])

    const currentCoins: { symbol: string; price: number; volume: number; change: number; source: string }[] = []

    // Parse Binance
    if (binanceRes?.ok) {
      const binanceData = await binanceRes.json()
      for (const t of binanceData) {
        const price = parseFloat(t.lastPrice)
        if (t.symbol.endsWith('USDT') && price > 0 && price <= 1) {
          currentCoins.push({
            symbol: t.symbol.replace('USDT', ''),
            price,
            volume: parseFloat(t.quoteVolume),
            change: parseFloat(t.priceChangePercent),
            source: 'binance',
          })
        }
      }
    }

    // Parse CoinGecko
    if (geckoRes?.ok) {
      const geckoData = await geckoRes.json()
      for (const c of geckoData) {
        if (c.current_price && c.current_price > 0 && c.current_price <= 1) {
          const sym = c.symbol.toUpperCase()
          if (!currentCoins.find((x) => x.symbol === sym)) {
            currentCoins.push({
              symbol: sym,
              price: c.current_price,
              volume: c.total_volume || 0,
              change: c.price_change_percentage_24h || 0,
              source: 'coingecko',
            })
          }
        }
      }
    }

    if (currentCoins.length === 0) {
      return NextResponse.json({ error: 'All APIs failed' }, { status: 500 })
    }

    // Get known coins from DB
    const { data: knownCoins } = await supabase.from('known_coins').select('symbol')
    const knownSet = new Set((knownCoins || []).map((c: any) => c.symbol))

    // Find new coins
    const newCoins = currentCoins.filter((c: any) => !knownSet.has(c.symbol))

    if (newCoins.length > 0) {
      // Insert new coins into DB
      await supabase.from('known_coins').upsert(
        newCoins.map((c: any) => ({ symbol: c.symbol, source: c.source || 'binance' })),
        { onConflict: 'symbol' }
      )

      // Send Telegram notification
      const lines = newCoins
        .filter((c: any) => c.price <= 1)
        .slice(0, 20)
        .map((c: any) => `• <b>${c.symbol}</b> — $${c.price < 0.01 ? c.price.toFixed(8) : c.price.toFixed(4)} (${c.change >= 0 ? '+' : ''}${c.change.toFixed(1)}%) Vol: $${(c.volume / 1000).toFixed(1)}K`)

      if (lines.length > 0) {
        const message = `🆕 <b>New Listings (≤$1)</b>\n\n${lines.join('\n')}\n\n🔗 Check Lowin for details`
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