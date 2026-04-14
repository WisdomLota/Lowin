'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Coin } from '@/types/coin'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PurchaseFormModalProps {
  coin: Coin | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function PurchaseFormModal({ coin, open, onClose, onSuccess }: PurchaseFormModalProps) {
  const [quantity, setQuantity] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [exchange, setExchange] = useState('bybit')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill buy price when coin changes
  useState(() => {
    if (coin) setBuyPrice(coin.current_price.toString())
  })

  async function handleSubmit() {
    if (!coin) return
    if (!quantity || !buyPrice) {
      setError('Quantity and buy price are required')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('purchases').insert({
      user_id: user.id,
      coin_id: coin.id,
      coin_symbol: coin.symbol,
      coin_name: coin.name,
      quantity: parseFloat(quantity),
      buy_price: parseFloat(buyPrice),
      exchange,
      purchased_at: new Date(date).toISOString(),
      notes: notes || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Reset form and close
    setQuantity('')
    setBuyPrice('')
    setNotes('')
    setLoading(false)
    onSuccess()
    onClose()
  }

  if (!coin) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">
            Log Purchase — {coin.symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-zinc-400 text-sm">Quantity</Label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 1000000"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-zinc-400 text-sm">Buy Price (USD)</Label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 0.00045"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-zinc-400 text-sm">Exchange</Label>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="w-full mt-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="bybit">Bybit</option>
              <option value="binance">Binance</option>
              <option value="coinbase">Coinbase</option>
              <option value="kucoin">KuCoin</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <Label className="text-zinc-400 text-sm">Purchase Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-zinc-400 text-sm">Notes (optional)</Label>
            <Input
              placeholder="e.g. Bought the dip"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? 'Saving...' : 'Log Purchase'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}