// app/api/coins/route.ts
import { NextResponse } from 'next/server';
import {
  fetchLowPriceCoins,
  filterNewCoins,
  filterGainers,
  filterLosers,
  filterByVolume,
  filterByTurnover
} from '@/lib/coingecko';
import { fetchBybitLowPriceCoins } from '@/lib/bybit';
import { Coin } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

// Helper to merge coins from different sources and track platform availability
function mergeCoins(coingeckoCoins: Coin[], bybitCoins: Coin[]): Coin[] {
  const coinMap = new Map<string, Coin>();

  // Add CoinGecko coins first
  for (const coin of coingeckoCoins) {
    coinMap.set(coin.symbol.toLowerCase(), { ...coin, source: 'coingecko' as const });
  }

  // Process Bybit coins
  for (const coin of bybitCoins) {
    const key = coin.symbol.toLowerCase();
    if (coinMap.has(key)) {
      // Coin exists on both platforms
      const existing = coinMap.get(key)!;
      coinMap.set(key, { ...existing, source: 'both' as const });
    } else {
      // Coin only on Bybit
      coinMap.set(key, { ...coin, source: 'bybit' as const });
    }
  }

  return Array.from(coinMap.values());
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const platformFilter = searchParams.get('platform') || 'all'; // NEW: Platform filter
    const searchQuery = searchParams.get('search') || ''; // NEW: Search query

    console.log(`🔍 Fetching coins - filter: ${filter}, platform: ${platformFilter}, search: "${searchQuery}"`);

    // Fetch from both sources in parallel
    const [coingeckoCoins, bybitCoins] = await Promise.all([
      platformFilter === 'bybit' ? Promise.resolve([]) : fetchLowPriceCoins(),
      platformFilter === 'coingecko' ? Promise.resolve([]) : fetchBybitLowPriceCoins()
    ]);

    // Merge coins from both sources
    const allCoins = mergeCoins(coingeckoCoins, bybitCoins);

    // Calculate platform-specific counts
    const coingeckoOnly = allCoins.filter(c => c.source === 'coingecko').length;
    const bybitOnly = allCoins.filter(c => c.source === 'bybit').length;
    const both = allCoins.filter(c => c.source === 'both').length;

    console.log(`✅ Total: ${allCoins.length} (CoinGecko only: ${coingeckoOnly}, Bybit only: ${bybitOnly}, Both: ${both})`);

    let filteredCoins = allCoins;

    // Apply platform filter
    if (platformFilter !== 'all') {
      filteredCoins = filteredCoins.filter(coin => coin.source === platformFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredCoins = filteredCoins.filter(coin => 
        coin.symbol.toLowerCase().includes(query) ||
        coin.name.toLowerCase().includes(query)
      );
    }

    // Apply tab filters
    switch (filter) {
      case 'new':
        filteredCoins = filterNewCoins(filteredCoins);
        break;
      case 'gainers':
        filteredCoins = filterGainers(filteredCoins);
        break;
      case 'losers':
        filteredCoins = filterLosers(filteredCoins);
        break;
      case 'volume':
        filteredCoins = filterByVolume(filteredCoins);
        break;
      case 'turnover':
        filteredCoins = filterByTurnover(filteredCoins);
        break;
      default:
        // Keep all coins for 'all' tab
        break;
    }

    return NextResponse.json({ 
      coins: filteredCoins,
      meta: {
        total: allCoins.length,
        filtered: filteredCoins.length,
        sources: {
          coingecko: coingeckoCoins.length,
          bybit: bybitCoins.length,
          coingeckoOnly,
          bybitOnly,
          both
        }
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coins' },
      { status: 500 }
    );
  }
}