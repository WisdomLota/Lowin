// components/Tabs.tsx
'use client';

import { TabType } from '@/types';
import { TrendingUp, TrendingDown, Activity, DollarSign, Star, Briefcase, Grid3x3 } from 'lucide-react';

interface TabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  { id: 'all' as TabType, label: 'All', icon: Grid3x3 },
  { id: 'new' as TabType, label: 'New', icon: Activity },
  { id: 'gainers' as TabType, label: 'Gainers', icon: TrendingUp },
  { id: 'losers' as TabType, label: 'Losers', icon: TrendingDown },
  { id: 'volume' as TabType, label: 'Volume', icon: DollarSign },
  { id: 'turnover' as TabType, label: 'Turnover', icon: Briefcase },
  { id: 'watchlist' as TabType, label: 'Watchlist', icon: Star },
  { id: 'portfolio' as TabType, label: 'Portfolio', icon: Briefcase }
];

export default function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <div className="bg-gray-900 border-b border-gray-800 sticky top-[120px] z-40">
      <div className="container mx-auto px-4">
        <div className="flex overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
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