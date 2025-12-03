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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    const coins = await fetchLowPriceCoins();

    let filteredCoins = coins;

    switch (filter) {
      case 'new':
        filteredCoins = filterNewCoins(coins);
        break;
      case 'gainers':
        filteredCoins = filterGainers(coins);
        break;
      case 'losers':
        filteredCoins = filterLosers(coins);
        break;
      case 'volume':
        filteredCoins = filterByVolume(coins);
        break;
      case 'turnover':
        filteredCoins = filterByTurnover(coins);
        break;
      default:
        filteredCoins = coins;
    }

    return NextResponse.json({ coins: filteredCoins });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coins' },
      { status: 500 }
    );
  }
}