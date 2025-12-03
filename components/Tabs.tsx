// components/Tabs.tsx
'use client';

import { TabType } from '@/types';
import { TrendingUp, TrendingDown, Activity, DollarSign, Star, Briefcase, Grid3x3 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface TabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  { id: 'all' as TabType, label: 'All', icon: Grid3x3, path: '/dashboard' },
  { id: 'new' as TabType, label: 'New', icon: Activity, path: '/dashboard' },
  { id: 'gainers' as TabType, label: 'Gainers', icon: TrendingUp, path: '/dashboard' },
  { id: 'losers' as TabType, label: 'Losers', icon: TrendingDown, path: '/dashboard' },
  { id: 'volume' as TabType, label: 'Volume', icon: DollarSign, path: '/dashboard' },
  { id: 'turnover' as TabType, label: 'Turnover', icon: Briefcase, path: '/dashboard' },
  { id: 'watchlist' as TabType, label: 'Watchlist', icon: Star, path: '/watchlist' },
  { id: 'portfolio' as TabType, label: 'Portfolio', icon: Briefcase, path: '/portfolio' }
];

export default function Tabs({ activeTab, onTabChange }: TabsProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.id === 'watchlist') {
      router.push('/watchlist');
    } else if (tab.id === 'portfolio') {
      router.push('/portfolio');
    } else {
      if (pathname !== '/dashboard') {
        router.push('/dashboard');
      }
      onTabChange(tab.id);
    }
  };

  return (
    <div className="bg-gray-900 border-b border-gray-800 sticky top-[120px] z-40">
      <div className="container mx-auto px-4">
        <div className="flex overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = (pathname === tab.path && tab.id === activeTab) || 
                           (pathname === '/watchlist' && tab.id === 'watchlist') ||
                           (pathname === '/portfolio' && tab.id === 'portfolio');
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}