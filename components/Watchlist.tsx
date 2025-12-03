// components/Watchlist.tsx
'use client';

import { useEffect, useState } from 'react';
import { Coin, WatchlistItem } from '@/types';
import CoinCard from './CoinCard';
import { Loader2 } from 'lucide-react';
import useSWR from 'swr';

interface WatchlistProps {
  onToggleWatchlist: (coin: Coin) => void;
  onCoinClick: (coin: Coin) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Watchlist({ onToggleWatchlist, onCoinClick }: WatchlistProps) {
  const { data: watchlistData, isLoading: watchlistLoading } = useSWR<{ watchlist: WatchlistItem[] }>(
    '/api/watchlist',
    fetcher,
    { refreshInterval: 30000 }
  );

  const { data: coinsData, isLoading: coinsLoading } = useSWR<{ coins: Coin[] }>(
    '/api/coins?filter=all',
    fetcher,
    { refreshInterval: 60000 }
  );

  const [watchlistCoins, setWatchlistCoins] = useState<Coin[]>([]);

  useEffect(() => {
    if (watchlistData?.watchlist && coinsData?.coins) {
      const coinIds = watchlistData.watchlist.map((item) => item.coinId);
      const filtered = coinsData.coins.filter((coin) => coinIds.includes(coin.id));
      setWatchlistCoins(filtered);
    }
  }, [watchlistData, coinsData]);

  const isLoading = watchlistLoading || coinsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  if (watchlistCoins.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">Your watchlist is empty</p>
        <p className="text-gray-500 text-sm mt-2">
          Click the star icon on any coin to add it to your watchlist
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {watchlistCoins.map((coin) => (
        <CoinCard
          key={coin.id}
          coin={coin}
          isInWatchlist={true}
          onToggleWatchlist={onToggleWatchlist}
          onClick={() => onCoinClick(coin)}
        />
      ))}
    </div>
  );
}