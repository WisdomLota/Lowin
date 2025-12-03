// lib/store.ts
import { create } from 'zustand';
import { Coin, WatchlistItem, Purchase, TabType } from '@/types';

interface AppState {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedCoin: Coin | null;
  setSelectedCoin: (coin: Coin | null) => void;
  watchlist: WatchlistItem[];
  setWatchlist: (watchlist: WatchlistItem[]) => void;
  purchases: Purchase[];
  setPurchases: (purchases: Purchase[]) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  activeTab: 'all',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedCoin: null,
  setSelectedCoin: (coin) => set({ selectedCoin: coin }),
  watchlist: [],
  setWatchlist: (watchlist) => set({ watchlist }),
  purchases: [],
  setPurchases: (purchases) => set({ purchases }),
  isAuthenticated: false,
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated })
}));