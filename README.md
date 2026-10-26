# Lowin

A personal finance dashboard built with Next.js 16 (App Router) and Supabase.

- **Coins** — tracks coins priced ≤ $1 across Binance, Bybit and CoinGecko, with new-listing, delisting, price-alert and milestone ($0.10 / $1.00) notifications (in-app and Telegram).
- **Portfolio** — purchases and a watchlist for tracked coins.
- **Journal** — a trading journal with Excel import (`/api/import-trades`) and monthly/yearly summaries.
- **Investments** — mutual funds, stocks, T-bills and savings, with monthly earnings and yearly returns (Modified Dietz, net of fees).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Other scripts: `npm run build`, `npm run lint`.

> This is Next.js 16: `middleware` is now `proxy` ([proxy.ts](proxy.ts)). Check `node_modules/next/dist/docs/` before relying on older conventions.

## Environment variables

Set these in `.env.local` and in Vercel (Production and Preview):

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser and server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser and server, subject to RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; used by the cron job and `/api/coins/new` (bypasses RLS) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot for alerts |
| `TELEGRAM_CHAT_ID` | Chat that receives alerts |
| `CRON_SECRET` | Bearer token required by `/api/cron/new-listings` (requests are rejected if unset) |

## Cron

[vercel.json](vercel.json) schedules `/api/cron/new-listings` daily at 08:00 UTC (the Hobby plan limit). It compares current listings with `known_coins` and sends new ones to Telegram. To run it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/new-listings
```

## API routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/coins` | public | Merged coin list, CDN-cached for 90s |
| `GET /api/coins/new` | public | Coins first seen in the last 7 days (`known_coins`) |
| `GET /api/coins/[id]/chart` | public | Price history |
| `GET /api/prices?symbols=A,B` | public | Spot prices by symbol |
| `POST /api/import-trades` | logged-in user | Parses an uploaded `.xlsx` into trades |
| `POST /api/notify-telegram` | logged-in user | Sends a Telegram message |
| `GET /api/cron/new-listings` | `CRON_SECRET` | New-listing check |

## Database

Tables are in Supabase and are not created by this repo. The list below is inferred from the queries in the code; confirm it against your project.

| Table | Columns used |
| --- | --- |
| `investments` | `id, user_id, type, title, platform, amount, currency, unit_price, units, expected_return_pct, processing_fee, buy_date, sell_date, sell_amount, notes, created_at` |
| `investment_transactions` | `id, user_id, investment_id, type (deposit/withdrawal/value_update), amount, date, notes, fee_amount, created_at` |
| `trades` | `id, user_id, date, name, amount, staked, leverage, open_price, close_price, pl_type, pl_percentage, amount_pl, lg_st, hint, comments, trade_mode, open_time, close_time, close_date, created_at` |
| `purchases` | `id, user_id, coin_id, coin_symbol, coin_name, quantity, buy_price, exchange, purchased_at, notes, created_at` |
| `watchlist` | `id, user_id, coin_id, coin_symbol, coin_name, source, added_at, comment, starred` |
| `price_alerts` | `id, user_id, coin_id, coin_symbol, coin_name, direction, target_price, triggered, created_at` |
| `notifications` | `id, user_id, type (delisting/price_alert/milestone/system), title, message, coin_symbol, read, created_at` |
| `known_coins` | `symbol (unique), source, first_seen_at` |

The browser talks to these tables directly with the anon key, so **row-level security must be enabled** on every user-owned table, with policies limiting rows to `auth.uid() = user_id`. `known_coins` is only touched with the service-role key.

`processing_fee` on an investment is the sum of the buy-date fee and any fees entered on later transactions (`fee_amount`). Fees are treated as a cost on top of the amount in all return calculations.
