// components/CoinList.tsx
'use client';

import { Coin } from '@/types';
import CoinCard from './CoinCard';
import { Loader2 } from 'lucide-react';

interface CoinListProps {
  coins: Coin[];
  watchlist: string[];
  isLoading: boolean;
  onToggleWatchlist: (coin: Coin) => void;
  onCoinClick: (coin: Coin) => void;
}

export default function CoinList({
  coins,
  watchlist,
  isLoading,
  onToggleWatchlist,
  onCoinClick
}: CoinListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  if (coins.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">No coins found</p>
        <p className="text-gray-500 text-sm mt-2">
          Try selecting a different filter
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {coins.map((coin) => (
        <CoinCard
          key={coin.id}
          coin={coin}
          isInWatchlist={watchlist.includes(coin.id)}
          onToggleWatchlist={onToggleWatchlist}
          onClick={() => onCoinClick(coin)}
        />
      ))}
    </div>
  );
}