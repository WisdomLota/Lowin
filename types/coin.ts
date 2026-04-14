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
  source: 'coingecko' | 'bybit'
  // Used for "New" tab — CoinGecko doesn't provide listing date,
  // so we'll approximate based on low market cap rank
  listed_recently?: boolean
}