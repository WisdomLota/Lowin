// app/(authenticated)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Coin, TabType, PlatformFilter } from '@/types';
import useSWR, { mutate } from 'swr';
import Tabs from '@/components/Tabs';
import CoinList from '@/components/CoinList';
import CoinModal from '@/components/CoinModal';
import { Loader2, RefreshCw, Search, Filter } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const { data: coinsData, isLoading: coinsLoading, mutate: mutateCoins } = useSWR<{ 
    coins: Coin[];
    meta?: {
      total: number;
      filtered: number;
      sources: {
        coingecko: number;
        bybit: number;
        coingeckoOnly: number;
        bybitOnly: number;
        both: number;
      };
    };
  }>(
    session ? `/api/coins?filter=${activeTab}&platform=${platformFilter}&search=${encodeURIComponent(searchQuery)}` : null,
    fetcher,
    { 
      refreshInterval: 60000,
      revalidateOnFocus: false,
      onSuccess: () => setInitialLoad(false)
    }
  );

  const { data: watchlistData } = useSWR(
    session ? '/api/watchlist' : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const coins = coinsData?.coins || [];
  const meta = coinsData?.meta;
  const watchlistIds = watchlistData?.watchlist.map((item: any) => item.coinId) || [];

  const handleToggleWatchlist = async (coin: Coin) => {
    if (!session) return;

    const isInWatchlist = watchlistIds.includes(coin.id);

    if (isInWatchlist) {
      await fetch(`/api/watchlist?coinId=${coin.id}`, { method: 'DELETE' });
    } else {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coinId: coin.id,
          symbol: coin.symbol,
          name: coin.name
        })
      });
    }

    mutate('/api/watchlist');
  };

  const handleRefresh = () => {
    mutateCoins();
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="container mx-auto px-4 py-6">
        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Platform Filter Dropdown */}
          <div className="relative flex items-center gap-2">
            <Filter className="text-gray-400" size={20} />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">All Platforms</option>
              <option value="coingecko">CoinGecko Only</option>
              <option value="bybit">Bybit Only</option>
              <option value="both">Both Platforms</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={coinsLoading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw size={16} className={coinsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats Bar */}
        {meta && (
          <div className="mb-6 bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-gray-400 block">Total Coins</span>
                <span className="text-xl font-semibold text-white">{meta.total}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Displayed</span>
                <span className="text-xl font-semibold text-white">{meta.filtered}</span>
              </div>
              <div>
                <span className="text-gray-400 block">CoinGecko Only</span>
                <span className="text-xl font-semibold text-purple-400">{meta.sources.coingeckoOnly}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Bybit Only</span>
                <span className="text-xl font-semibold text-blue-400">{meta.sources.bybitOnly}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Both Platforms</span>
                <span className="text-xl font-semibold text-green-400">{meta.sources.both}</span>
              </div>
            </div>
          </div>
        )}

        {/* Initial Load Message */}
        {initialLoad && coinsLoading && (
          <div className="mb-6 bg-blue-900 bg-opacity-20 border border-blue-600 text-blue-400 px-4 py-3 rounded-lg">
            <p className="font-semibold">🔄 Fetching comprehensive coin data...</p>
            <p className="text-sm mt-1">
              This may take 30-60 seconds on first load. Fetching from CoinGecko (2,500 coins) and Bybit...
            </p>
          </div>
        )}

        {/* Active Filters Display */}
        {(searchQuery || platformFilter !== 'all') && (
          <div className="mb-4 flex flex-wrap gap-2">
            {searchQuery && (
              <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm flex items-center gap-2">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white">×</button>
              </span>
            )}
            {platformFilter !== 'all' && (
              <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm flex items-center gap-2">
                Platform: {platformFilter === 'coingecko' ? 'CoinGecko' : platformFilter === 'bybit' ? 'Bybit' : 'Both'}
                <button onClick={() => setPlatformFilter('all')} className="text-gray-400 hover:text-white">×</button>
              </span>
            )}
          </div>
        )}
        <CoinList
          coins={coins}
          watchlist={watchlistIds}
          isLoading={coinsLoading}
          onToggleWatchlist={handleToggleWatchlist}
          onCoinClick={setSelectedCoin}
        />
      </main>
      {selectedCoin && (
        <CoinModal coin={selectedCoin} onClose={() => setSelectedCoin(null)} />
      )}
    </div>
  );
}
    