// app/(authenticated)/watchlist/page.tsx
'use client';

import { useState } from 'react';
import Tabs from '@/components/Tabs';
import { TabType } from '@/types';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Coin } from '@/types';
import { mutate } from 'swr';
import Watchlist from '@/components/Watchlist';
import CoinModal from '@/components/CoinModal';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const handleToggleWatchlist = async (coin: Coin) => {
    await fetch(`/api/watchlist?coinId=${coin.id}`, { method: 'DELETE' });
    mutate('/api/watchlist');
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
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">My Watchlist</h1>
        <Watchlist
          onToggleWatchlist={handleToggleWatchlist}
          onCoinClick={setSelectedCoin}
        />
      </div>

      {selectedCoin && (
        <CoinModal coin={selectedCoin} onClose={() => setSelectedCoin(null)} />
      )}
    </div>
  );
}