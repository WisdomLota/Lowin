// components/PurchaseHistory.tsx
'use client';

import { useState } from 'react';
import { Purchase, PurchaseWithCurrentPrice, Coin } from '@/types';
import { Plus, Trash2, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import useSWR, { mutate } from 'swr';

interface PurchaseHistoryProps {
  coins: Coin[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PurchaseHistory({ coins }: PurchaseHistoryProps) {
  const { data, isLoading } = useSWR<{ purchases: Purchase[] }>(
    '/api/purchases',
    fetcher,
    { refreshInterval: 30000 }
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [coinSearchQuery, setCoinSearchQuery] = useState('');
  const [showCoinDropdown, setShowCoinDropdown] = useState(false);
  const [formData, setFormData] = useState({
    coinId: '',
    symbol: '',
    name: '',
    quantity: '',
    buyPrice: '',
    exchange: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const filteredCoins = coins.filter(coin => 
    coin.name.toLowerCase().includes(coinSearchQuery.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(coinSearchQuery.toLowerCase())
  );

  const purchases: PurchaseWithCurrentPrice[] = (data?.purchases || []).map((purchase) => {
    const coin = coins.find((c) => c.id === purchase.coinId);
    const currentPrice = coin?.current_price || 0;
    const currentValue = purchase.quantity * currentPrice;
    const invested = purchase.quantity * purchase.buyPrice;
    const profitLoss = currentValue - invested;
    const profitLossPercentage = invested > 0 ? (profitLoss / invested) * 100 : 0;

    return {
      ...purchase,
      currentPrice,
      currentValue,
      profitLoss,
      profitLossPercentage
    };
  });

  const totalInvested = purchases.reduce((sum, p) => sum + (p.quantity * p.buyPrice), 0);
  const totalCurrentValue = purchases.reduce((sum, p) => sum + p.currentValue, 0);
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalProfitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowAddForm(false);
        setFormData({
          coinId: '',
          symbol: '',
          name: '',
          quantity: '',
          buyPrice: '',
          exchange: '',
          notes: '',
          date: new Date().toISOString().split('T')[0]
        });
        mutate('/api/purchases');
      } else {
        alert('Failed to add purchase');
      }
    } catch (error) {
      console.error('Error adding purchase:', error);
      alert('Failed to add purchase');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase?')) return;

    try {
      const response = await fetch(`/api/purchases?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        mutate('/api/purchases');
      } else {
        alert('Failed to delete purchase');
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
      alert('Failed to delete purchase');
    }
  };

  const handleCoinSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const coinId = e.target.value;
    const coin = coins.find((c) => c.id === coinId);
    
    if (coin) {
      setFormData({
        ...formData,
        coinId: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        buyPrice: coin.current_price.toString()
      });
    }
  };

  const formatPrice = (price: number) => {
    if (price < 0.00001) return price.toExponential(2);
    return price.toFixed(8);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Total Invested</p>
          <p className="text-2xl font-bold text-white">${totalInvested.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Current Value</p>
          <p className="text-2xl font-bold text-white">${totalCurrentValue.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Total P&L</p>
          <div className={`flex items-center gap-2 ${totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalProfitLoss >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <span className="text-2xl font-bold">
              ${Math.abs(totalProfitLoss).toFixed(2)} ({totalProfitLossPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Add Purchase Button */}
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        <Plus size={20} />
        Add Purchase
      </button>

      {/* Add Purchase Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Log New Purchase</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Coin
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for a coin..."
                  value={coinSearchQuery}
                  onChange={(e) => {
                    setCoinSearchQuery(e.target.value);
                    setShowCoinDropdown(true);
                  }}
                  onFocus={() => setShowCoinDropdown(true)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {formData.coinId && (
                  <div className="mt-2 text-sm text-gray-400">
                    Selected: {formData.name} ({formData.symbol.toUpperCase()})
                  </div>
                )}
                
                {showCoinDropdown && coinSearchQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-60 overflow-y-auto">
                    {filteredCoins.length > 0 ? (
                      filteredCoins.map((coin) => (
                        <button
                          key={coin.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              coinId: coin.id,
                              symbol: coin.symbol,
                              name: coin.name,
                              buyPrice: coin.current_price.toString()
                            });
                            setCoinSearchQuery('');
                            setShowCoinDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white"
                        >
                          {coin.name} ({coin.symbol.toUpperCase()}) - ${formatPrice(coin.current_price)}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-400">No coins found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Buy Price (USD)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.buyPrice}
                  onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0.00000000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exchange
                </label>
                <input
                  type="text"
                  value={formData.exchange}
                  onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Binance, Bybit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Add any notes about this purchase..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Add Purchase
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Purchase List */}
      {purchases.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No purchases logged yet</p>
          <p className="text-gray-500 text-sm mt-2">
            Add your first purchase to start tracking your portfolio
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase) => {
            const isProfit = purchase.profitLoss >= 0;
            
            return (
              <div
                key={purchase.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-white text-lg">
                      {purchase.name} ({purchase.symbol.toUpperCase()})
                    </h4>
                    <p className="text-sm text-gray-400">
                      {purchase.exchange} • {format(new Date(purchase.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(purchase.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Quantity</p>
                    <p className="font-mono font-semibold text-white">
                      {purchase.quantity.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Buy Price</p>
                    <p className="font-mono font-semibold text-white">
                      ${formatPrice(purchase.buyPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Current Price</p>
                    <p className="font-mono font-semibold text-white">
                      ${formatPrice(purchase.currentPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Invested</p>
                    <p className="font-semibold text-white">
                      ${(purchase.quantity * purchase.buyPrice).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Current Value</p>
                    <p className="text-lg font-bold text-white">
                      ${purchase.currentValue.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Profit/Loss</p>
                    <div className={`flex items-center gap-1 ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                      {isProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span className="text-lg font-bold">
                        ${Math.abs(purchase.profitLoss).toFixed(2)} ({purchase.profitLossPercentage.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {purchase.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Notes</p>
                    <p className="text-sm text-gray-300">{purchase.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}