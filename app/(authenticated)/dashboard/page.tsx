// app/(authenticated)/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Coin, TabType } from '@/types';
import useSWR, { mutate } from 'swr';
import Tabs from '@/components/Tabs';
import CoinList from '@/components/CoinList';
import CoinModal from '@/components/CoinModal';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const { data: coinsData, isLoading: coinsLoading } = useSWR<{ coins: Coin[] }>(
    session ? `/api/coins?filter=${activeTab}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const { data: watchlistData } = useSWR(
    session ? '/api/watchlist' : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const coins = coinsData?.coins || [];
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="container mx-auto px-4 py-6">
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