// components/CoinModal.tsx
'use client';

import { Coin } from '@/types';
import { X, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface CoinModalProps {
  coin: Coin;
  onClose: () => void;
}

export default function CoinModal({ coin, onClose }: CoinModalProps) {
  const priceChange = coin.price_change_percentage_24h || 0;
  const isPositive = priceChange >= 0;

  const formatPrice = (price: number) => {
    if (price < 0.00001) return price.toExponential(2);
    return price.toFixed(8);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  const sparklineData = coin.sparkline_in_7d?.price.map((price, index) => ({
    index,
    price
  })) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              <Image
                src={coin.image}
                alt={coin.name}
                fill
                className="rounded-full"
                unoptimized
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{coin.name}</h2>
              <p className="text-gray-400">{coin.symbol.toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Price Section */}
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-white">
                ${formatPrice(coin.current_price)}
              </span>
              <div className={`flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                <span className="text-lg font-semibold">{Math.abs(priceChange).toFixed(2)}%</span>
              </div>
            </div>
            <p className="text-sm text-gray-400">Last 24 hours</p>
          </div>

          {/* Sparkline Chart */}
          {sparklineData.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">7 Day Price Chart</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sparklineData}>
                  <XAxis dataKey="index" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem'
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                    formatter={(value: number) => [`$${formatPrice(value)}`, 'Price']}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={isPositive ? '#34d399' : '#f87171'}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Market Cap</p>
              <p className="text-lg font-semibold text-white">{formatVolume(coin.market_cap)}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">24h Volume</p>
              <p className="text-lg font-semibold text-white">{formatVolume(coin.total_volume)}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">24h High</p>
              <p className="text-lg font-semibold text-white">${formatPrice(coin.high_24h)}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">24h Low</p>
              <p className="text-lg font-semibold text-white">${formatPrice(coin.low_24h)}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">All Time High</p>
              <p className="text-lg font-semibold text-white">${formatPrice(coin.ath)}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">All Time Low</p>
              <p className="text-lg font-semibold text-white">${formatPrice(coin.atl)}</p>
            </div>
          </div>

          {/* External Links */}
          <div className="flex gap-3">
            <a
              href={`https://www.coingecko.com/en/coins/${coin.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              View on CoinGecko
              <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}