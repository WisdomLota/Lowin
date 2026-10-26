import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BinanceTicker, CoinGeckoMarket } from '@/types/coin'
import { sendTelegram } from '@/lib/telegram'
import { fetchCoinPricesBySymbols } from '@/lib/coingecko'
import { highestMilestone, milestoneTitle, formatMilestonePrice } from '@/lib/milestones'

interface ListedCoin {
  symbol: string
  price: number
  volume: number
  change: number
  source: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Alerts for tracked coins (portfolio + watchlist) that reached a price milestone.
// The in-app check only runs while the app is open; this covers the rest.
async function checkMilestones(): Promise<number> {
  const [{ data: purchases }, { data: watchlist }] = await Promise.all([
    supabase.from('purchases').select('user_id, coin_symbol, coin_name'),
    supabase.from('watchlist').select('user_id, coin_symbol, coin_name'),
  ])

  type Tracked = { userId: string; symbol: string; name: string; portfolio: boolean }
  const tracked = new Map<string, Tracked>()
  for (const w of watchlist || []) {
    tracked.set(`${w.user_id}:${w.coin_symbol}`, { userId: w.user_id, symbol: w.coin_symbol, name: w.coin_name, portfolio: false })
  }
  for (const p of purchases || []) {
    tracked.set(`${p.user_id}:${p.coin_symbol}`, { userId: p.user_id, symbol: p.coin_symbol, name: p.coin_name, portfolio: true })
  }
  if (tracked.size === 0) return 0

  // fetchCoinPricesBySymbols handles 10 symbols at a time
  const symbols = Array.from(new Set(Array.from(tracked.values()).map((t) => t.symbol)))
  const priceMap = new Map<string, number>()
  for (let i = 0; i < symbols.length; i += 10) {
    const chunk = await fetchCoinPricesBySymbols(symbols.slice(i, i + 10))
    for (const [symbol, price] of chunk) priceMap.set(symbol, price)
  }

  let sent = 0
  for (const t of tracked.values()) {
    const price = priceMap.get(t.symbol)
    if (!price) continue
    const milestone = highestMilestone(price)
    if (!milestone) continue

    const title = milestoneTitle(t.symbol, milestone.label)
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', t.userId)
      .eq('coin_symbol', t.symbol)
      .eq('type', 'milestone')
      .eq('title', title)
      .limit(1)
    if (existing && existing.length > 0) continue

    // Record first so the alert is only ever sent once
    const { error } = await supabase.from('notifications').insert({
      user_id: t.userId,
      type: 'milestone',
      title,
      message: `${t.name || t.symbol} hit ${milestone.label}! Currently at ${formatMilestonePrice(price)}`,
      coin_symbol: t.symbol,
    })
    if (error) {
      console.error('Failed to record milestone notification:', error.message)
      continue
    }

    await sendTelegram(
      `🎯 <b>${t.name || t.symbol} hit ${milestone.label}!</b>\n\nCurrently at ${formatMilestonePrice(price)}\nSource: ${t.portfolio ? 'Portfolio' : 'Watchlist'}\n\n🔗 Check Lowin for details`
    )
    sent++
  }
  return sent
}


export async function GET(request: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let milestonesSent = 0
  try {
    milestonesSent = await checkMilestones()
  } catch (error) {
    console.error('Milestone check error:', error)
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

    const currentCoins: ListedCoin[] = []

    // Parse Binance
    if (binanceRes?.ok) {
      const binanceData: BinanceTicker[] = await binanceRes.json()
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
      const geckoData: CoinGeckoMarket[] = await geckoRes.json()
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
    const knownSet = new Set((knownCoins || []).map((c: { symbol: string }) => c.symbol))

    // Find new coins
    const newCoins = currentCoins.filter((c) => !knownSet.has(c.symbol))

    if (newCoins.length > 0) {
      // Insert new coins into DB
      await supabase.from('known_coins').upsert(
        newCoins.map((c) => ({ symbol: c.symbol, source: c.source || 'binance' })),
        { onConflict: 'symbol' }
      )

      // Send Telegram notification
      const lines = newCoins
        .filter((c) => c.price <= 1 && c.volume > 1000)
        .slice(0, 20)
        .map((c) => `• <b>${c.symbol}</b> [${c.source === 'binance' ? 'Binance' : 'CoinGecko'}] — $${c.price < 0.01 ? c.price.toFixed(8) : c.price.toFixed(4)} (${c.change >= 0 ? '+' : ''}${c.change.toFixed(1)}%) Vol: $${(c.volume / 1000).toFixed(1)}K`)

      if (lines.length > 0) {
        const message = `🆕 <b>New Listings (≤$1)</b>\n\n${lines.join('\n')}\n\n🔗 Check Lowin for details`
        await sendTelegram(message)
      }
    }

    return NextResponse.json({
      checked: currentCoins.length,
      newFound: newCoins.length,
      milestonesSent,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}