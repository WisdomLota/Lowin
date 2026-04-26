'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TradeFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (trade: any) => Promise<{ error: string | null }>
}

export function TradeFormModal({ open, onClose, onSubmit }: TradeFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
  date: new Date().toISOString().split('T')[0],
      name: '',
      amount: '',
      staked: '',
      leverage: '10X',
      open_price: '',
      close_price: '',
      pl_type: 'P',
      pl_percentage: '',
      amount_pl: '',
      lg_st: 'ST',
      hint: '',
      comments: '',
      trade_mode: 'real',
    })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.name || !form.open_price || !form.close_price) {
      toast.error('Name, open price and close price are required')
      return
    }

    setLoading(true)

    const result = await onSubmit({
      date: form.date,
      name: form.name.toUpperCase(),
      amount: parseFloat(form.amount) || 0,
      staked: parseFloat(form.staked) || 0,
      leverage: form.leverage,
      open_price: parseFloat(form.open_price),
      close_price: parseFloat(form.close_price),
      pl_type: form.pl_type,
      pl_percentage: parseFloat(form.pl_percentage) || 0,
      amount_pl: parseFloat(form.amount_pl) || 0,
      lg_st: form.lg_st,
      hint: form.hint || null,
      comments: form.comments || null,
      trade_mode: form.trade_mode,
    })

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Trade logged successfully')
      setForm({
        date: new Date().toISOString().split('T')[0],
        name: '', amount: '', staked: '', leverage: '10X',
        open_price: '', close_price: '', pl_type: 'P',
        pl_percentage: '', amount_pl: '', lg_st: 'ST',
        hint: '', comments: '', trade_mode: 'real',
      })
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Log Trade</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <Label className="text-zinc-400 text-xs">Mode</Label>
            <select value={form.trade_mode} onChange={(e) => updateField('trade_mode', e.target.value)}
              className="w-full mt-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none">
              <option value="real">Real</option>
              <option value="demo">Demo</option>
            </select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Date</Label>
            <Input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Name / Pair</Label>
            <Input placeholder="e.g. PENGU" value={form.name} onChange={(e) => updateField('name', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Amount (USD)</Label>
            <Input type="number" step="any" placeholder="10.24" value={form.amount} onChange={(e) => updateField('amount', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Staked</Label>
            <Input type="number" step="any" value={form.staked} onChange={(e) => updateField('staked', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Leverage</Label>
            <select value={form.leverage} onChange={(e) => updateField('leverage', e.target.value)}
              className="w-full mt-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none">
              {['1X', '2X', '3X', '5X', '10X', '20X', '25X', '50X', '100X'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Direction</Label>
            <select value={form.lg_st} onChange={(e) => updateField('lg_st', e.target.value)}
              className="w-full mt-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none">
              <option value="ST">Short</option>
              <option value="LG">Long</option>
            </select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Open Price</Label>
            <Input type="number" step="any" value={form.open_price} onChange={(e) => updateField('open_price', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Close Price</Label>
            <Input type="number" step="any" value={form.close_price} onChange={(e) => updateField('close_price', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">P/L Type</Label>
            <select value={form.pl_type} onChange={(e) => updateField('pl_type', e.target.value)}
              className="w-full mt-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none">
              <option value="P">Profit</option>
              <option value="L">Loss</option>
            </select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">P/L %</Label>
            <Input type="number" step="any" placeholder="12" value={form.pl_percentage} onChange={(e) => updateField('pl_percentage', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div className="col-span-2">
            <Label className="text-zinc-400 text-xs">Amount P/L (USD)</Label>
            <Input type="number" step="any" placeholder="1.1273" value={form.amount_pl} onChange={(e) => updateField('amount_pl', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div className="col-span-2">
            <Label className="text-zinc-400 text-xs">Hint</Label>
            <Input placeholder="Trading signal or hint..." value={form.hint} onChange={(e) => updateField('hint', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div className="col-span-2">
            <Label className="text-zinc-400 text-xs">Comments</Label>
            <Input placeholder="Trade notes..." value={form.comments} onChange={(e) => updateField('comments', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading}
          className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? 'Saving...' : 'Log Trade'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}