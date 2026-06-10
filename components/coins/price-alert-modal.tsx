'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Coin } from '@/types/coin'
import { useNotifications } from '@/hooks/useNotifications'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PriceAlertModalProps {
  coin: Coin | null
  open: boolean
  onClose: () => void
}

export function PriceAlertModal({ coin, open, onClose }: PriceAlertModalProps) {
  const { addPriceAlert } = useNotifications()
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [targetPrice, setTargetPrice] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!coin || !targetPrice) {
      toast.error('Please enter a target price')
      return
    }

    setLoading(true)

    const result = await addPriceAlert({
      coin_id: coin.id,
      coin_symbol: coin.symbol,
      coin_name: coin.name,
      direction,
      target_price: parseFloat(targetPrice),
    })

    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`Alert set: ${coin.symbol} goes ${direction} $${targetPrice}`)
      setTargetPrice('')
      onClose()
    }
  }

  if (!coin) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#1a0f00] border-[#874708]/20 text-white max-w-sm!">
        <DialogHeader>
          <DialogTitle className="text-white">Set Price Alert — {coin.symbol}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <p className="text-xs text-zinc-500">
            Current price: ${coin.current_price < 0.0001 ? coin.current_price.toFixed(8) : coin.current_price.toFixed(6)}
          </p>

          <div>
            <Label className="text-zinc-400 text-xs">Alert when price goes</Label>
            <select value={direction} onChange={(e) => setDirection(e.target.value as any)}
              className="w-full mt-1 rounded-md bg-[#2a1a00] border border-[#874708]/30 text-white text-sm px-3 py-2 outline-none">
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </div>

          <div>
            <Label className="text-zinc-400 text-xs">Target Price (USD)</Label>
            <Input type="number" step="any" placeholder="0.001" value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="bg-[#2a1a00] border-[#874708]/30 text-white mt-1 text-sm" />
          </div>

          <Button onClick={handleSubmit} disabled={loading}
            className="w-full bg-[#FF8D19] hover:bg-[#e67d15] text-white">
            {loading ? 'Setting...' : 'Set Alert'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}