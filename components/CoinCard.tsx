// components/CoinCard.tsx
'use client';

import { Coin } from '@/types';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import Image from 'next/image';

interface CoinCardProps {
  coin: Coin;
  isInWatchlist: boolean;
  onToggleWatchlist: (coin: Coin) => void;
  onClick: () => void;
}

export default function CoinCard({ coin, isInWatchlist, onToggleWatchlist, onClick }: CoinCardProps) {
  const priceChange = coin.price_change_percentage_24h || 0;
  const isPositive = priceChange >= 0;

  const formatPrice = (price: number) => {
    if (price < 0.00001) return price.toExponential(2);
    return price.toFixed(6);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700 hover:border-purple-500"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <Image
              src={coin.image}
              alt={coin.name}
              fill
              className="rounded-full"
              unoptimized
            />
          </div>
          <div>
            <h3 className="font-semibold text-white">{coin.symbol.toUpperCase()}</h3>
            <p className="text-xs text-gray-400">{coin.name}</p>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist(coin);
          }}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Star
            size={18}
            className={isInWatchlist ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
          />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Price</span>
          <span className="font-mono font-semibold text-white">
            ${formatPrice(coin.current_price)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">24h Change</span>
          <div className={`flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="font-semibold">{Math.abs(priceChange).toFixed(2)}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Volume</span>
          <span className="text-sm font-medium text-white">
            {formatVolume(coin.total_volume)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Market Cap</span>
          <span className="text-sm font-medium text-white">
            {formatVolume(coin.market_cap)}
          </span>
        </div>
      </div>
    </div>
  );
}