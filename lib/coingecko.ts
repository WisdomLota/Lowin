// lib/coingecko.ts
import { Coin } from '@/types';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const MAX_PRICE = 0.01;

// Cache for API responses
let cachedCoins: Coin[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function fetchLowPriceCoins(): Promise<Coin[]> {
  // Return cached data if still valid
  if (cachedCoins && Date.now() - lastFetchTime < CACHE_DURATION) {
    return cachedCoins;
  }

  try {
    // Fetch all coins with sparkline data
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from CoinGecko');
    }

    const allCoins: Coin[] = await response.json();
    
    // Filter coins with price <= $0.01
    const lowPriceCoins = allCoins.filter(
      coin => coin.current_price <= MAX_PRICE && coin.current_price > 0
    );

    cachedCoins = lowPriceCoins;
    lastFetchTime = Date.now();

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
    return coins[0] || null;
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