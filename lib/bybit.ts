// lib/bybit.ts
import { Coin } from '@/types';

const BYBIT_API = 'https://api.bybit.com';
const MAX_PRICE = 0.01;

// Cache for Bybit data
let cachedBybitCoins: Coin[] | null = null;
let lastBybitFetch = 0;
const BYBIT_CACHE_DURATION = 60000; // 1 minute

export async function fetchBybitLowPriceCoins(): Promise<Coin[]> {
  // Return cached data if still valid
  if (cachedBybitCoins && Date.now() - lastBybitFetch < BYBIT_CACHE_DURATION) {
    return cachedBybitCoins;
  }

  try {
    // Fetch all spot tickers from Bybit
    const response = await fetch(`${BYBIT_API}/v5/market/tickers?category=spot`);

    if (!response.ok) {
      throw new Error('Failed to fetch from Bybit');
    }

    const data = await response.json();
    
    if (data.retCode !== 0 || !data.result?.list) {
      throw new Error('Invalid Bybit response');
    }

    const lowPriceCoins: Coin[] = [];

    for (const ticker of data.result.list) {
      // Only process USDT pairs
      if (!ticker.symbol.endsWith('USDT')) continue;

      const price = parseFloat(ticker.lastPrice);
      
      // Filter for coins <= $0.01
      if (price <= MAX_PRICE && price > 0) {
        const symbol = ticker.symbol.replace('USDT', '').toLowerCase();
        const volume24h = parseFloat(ticker.turnover24h || '0');
        const priceChange24h = parseFloat(ticker.price24hPcnt || '0') * 100;

        // Create a Coin object compatible with our interface
        lowPriceCoins.push({
          id: `bybit-${symbol}`,
          symbol: symbol,
          name: symbol.toUpperCase(),
          image: `https://cdn.coinranking.com/coins/${symbol}.png`, // Fallback image
          current_price: price,
          market_cap: 0, // Bybit doesn't provide this
          market_cap_rank: 9999,
          fully_diluted_valuation: null,
          total_volume: volume24h,
          high_24h: parseFloat(ticker.highPrice24h || price.toString()),
          low_24h: parseFloat(ticker.lowPrice24h || price.toString()),
          price_change_24h: price * (priceChange24h / 100),
          price_change_percentage_24h: priceChange24h,
          market_cap_change_24h: 0,
          market_cap_change_percentage_24h: 0,
          circulating_supply: 0,
          total_supply: null,
          max_supply: null,
          ath: parseFloat(ticker.highPrice24h || price.toString()),
          ath_change_percentage: 0,
          ath_date: new Date().toISOString(),
          atl: parseFloat(ticker.lowPrice24h || price.toString()),
          atl_change_percentage: 0,
          atl_date: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          source: 'bybit' as const // Add source tag
        });
      }
    }

    cachedBybitCoins = lowPriceCoins;
    lastBybitFetch = Date.now();

    console.log(`✅ Bybit: Found ${lowPriceCoins.length} coins ≤ $0.01`);
    return lowPriceCoins;
  } catch (error) {
    console.error('Bybit API Error:', error);
    return cachedBybitCoins || [];
  }
}