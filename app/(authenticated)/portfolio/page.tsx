// app/(authenticated)/portfolio/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import PurchaseHistory from '@/components/PurchaseHistory';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Coin } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PortfolioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const { data: coinsData, isLoading } = useSWR<{ coins: Coin[] }>(
    session ? '/api/coins?filter=all' : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">My Portfolio</h1>
        <PurchaseHistory coins={coinsData?.coins || []} />
      </div>
    </div>
  );
}