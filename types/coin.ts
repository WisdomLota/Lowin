export interface Coin {
  id: string
  symbol: string
  name: string
  image: string | null
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
  total_volume: number
  circulating_supply: number
  market_cap_rank: number | null
  source: 'coingecko' | 'bybit' | 'binance'
  market?: 'spot' | 'perpetual'
  // Used for "New" tab — CoinGecko doesn't provide listing date,
  // so we'll approximate based on low market cap rank
  listed_recently?: boolean
}

// Raw exchange / CoinGecko API shapes (only the fields we read)
export interface BinanceTicker {
  symbol: string
  lastPrice: string
  priceChangePercent: string
  quoteVolume: string
}

export interface BybitTicker {
  symbol: string
  lastPrice: string
  price24hPcnt: string
  volume24h: string
  turnover24h: string
}

export interface BybitLegacyTicker {
  s: string
  lp: string
  cp?: string
  qv?: string
}

export interface CoinGeckoMarket {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number | null
  price_change_percentage_24h: number | null
  market_cap: number | null
  total_volume: number | null
  circulating_supply: number | null
  market_cap_rank: number | null
}

export interface CoinGeckoSearchCoin {
  id: string
  symbol?: string
}
