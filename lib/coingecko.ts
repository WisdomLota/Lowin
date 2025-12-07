// lib/coingecko.ts
import { Coin } from '@/types';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const MAX_PRICE = 0.01;
const PAGES_TO_FETCH = 10; // Fetch 10 pages = 2,500 coins
const PER_PAGE = 250;

// Cache for API responses
let cachedCoins: Coin[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 300000; // 5 minutes (longer cache for multi-page fetch)

// Helper function to delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchLowPriceCoins(): Promise<Coin[]> {
  // Return cached data if still valid
  if (cachedCoins && Date.now() - lastFetchTime < CACHE_DURATION) {
    console.log(`✅ CoinGecko: Using cached data (${cachedCoins.length} coins)`);
    return cachedCoins;
  }

  console.log(`🔄 CoinGecko: Fetching ${PAGES_TO_FETCH} pages (${PAGES_TO_FETCH * PER_PAGE} coins)...`);

  try {
    const allCoins: Coin[] = [];

    // Fetch multiple pages sequentially to respect rate limits
    for (let page = 1; page <= PAGES_TO_FETCH; page++) {
      try {
        const response = await fetch(
          `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${PER_PAGE}&page=${page}&sparkline=true&price_change_percentage=24h`,
          { 
            next: { revalidate: 300 },
            cache: 'no-store' // Prevent Next.js caching during development
          }
        );

        if (!response.ok) {
          console.warn(`⚠️ CoinGecko page ${page} failed: ${response.status}`);
          break; // Stop fetching if we hit rate limit
        }

        const pageCoins: Coin[] = await response.json();
        allCoins.push(...pageCoins);

        console.log(`✅ CoinGecko: Fetched page ${page}/${PAGES_TO_FETCH} (${pageCoins.length} coins)`);

        // Delay between requests to respect rate limits (2 seconds)
        if (page < PAGES_TO_FETCH) {
          await delay(2000);
        }
      } catch (error) {
        console.error(`❌ CoinGecko page ${page} error:`, error);
        break;
      }
    }

    // Filter coins with price <= $0.01 and add source tag
    const lowPriceCoins = allCoins
      .filter(coin => coin.current_price <= MAX_PRICE && coin.current_price > 0)
      .map(coin => ({ ...coin, source: 'coingecko' as const }));

    cachedCoins = lowPriceCoins;
    lastFetchTime = Date.now();

    console.log(`✅ CoinGecko: Total ${allCoins.length} coins fetched, ${lowPriceCoins.length} are ≤ $0.01`);
    return lowPriceCoins;
  } catch (error) {
    console.error('CoinGecko API Error:', error);
    return cachedCoins || [];
  }
}

export async function fetchCoinDetails(coinId: string): Promise<Coin | null> {
  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=true`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch coin details');
    }

    const coins: Coin[] = await response.json();
    return coins[0] ? { ...coins[0], source: 'coingecko' as const } : null;
  } catch (error) {
    console.error('CoinGecko API Error:', error);
    return null;
  }
}

export function filterNewCoins(coins: Coin[]): Coin[] {
  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
  
  return coins.filter(coin => {
    const lastUpdated = new Date(coin.last_updated).getTime();
    return lastUpdated >= twoDaysAgo;
  });
}

export function filterGainers(coins: Coin[], limit: number = 50): Coin[] {
  return [...coins]
    .filter(coin => coin.price_change_percentage_24h > 0)
    .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
    .slice(0, limit);
}

export function filterLosers(coins: Coin[], limit: number = 50): Coin[] {
  return [...coins]
    .filter(coin => coin.price_change_percentage_24h < 0)
    .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
    .slice(0, limit);
}

export function filterByVolume(coins: Coin[], limit: number = 50): Coin[] {
  return [...coins]
    .sort((a, b) => b.total_volume - a.total_volume)
    .slice(0, limit);
}

export function filterByTurnover(coins: Coin[], limit: number = 50): Coin[] {
  return [...coins]
    .map(coin => ({
      ...coin,
      turnover: coin.total_volume * coin.current_price
    }))
    .sort((a, b) => b.turnover - a.turnover)
    .slice(0, limit);
}