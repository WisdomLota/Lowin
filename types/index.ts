// types/index.ts
export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
  sparkline_in_7d?: {
    price: number[];
  };
  source?: 'coingecko' | 'bybit' | 'both'; // NEW: Track data source
}

export interface WatchlistItem {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  addedAt: string;
}

export interface Purchase {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
  exchange: string;
  notes?: string;
  date: string;
  createdAt: string;
}

export interface PurchaseWithCurrentPrice extends Purchase {
  currentPrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export type TabType = 'all' | 'new' | 'gainers' | 'losers' | 'volume' | 'turnover' | 'watchlist' | 'portfolio';

export type PlatformFilter = 'all' | 'coingecko' | 'bybit' | 'both';