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

interface AddInvestmentModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (inv: any) => Promise<{ error: string | null }>
  defaultType: 'mutual_fund' | 'stock'
}

export function AddInvestmentModal({ open, onClose, onSubmit, defaultType }: AddInvestmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: defaultType,
    title: '',
    platform: '',
    amount: '',
    currency: 'NGN',
    unit_price: '',
    units: '',
    expected_return_pct: '',
    processing_fee: '',
    buy_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.title || !form.amount || !form.platform) {
      toast.error('Title, amount, and platform are required')
      return
    }

    setLoading(true)

    const result = await onSubmit({
      type: form.type,
      title: form.title,
      platform: form.platform,
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
      units: form.units ? parseFloat(form.units) : null,
      expected_return_pct: parseFloat(form.expected_return_pct) || 0,
      processing_fee: parseFloat(form.processing_fee) || 0,
      buy_date: form.buy_date,
      sell_date: null,
      sell_amount: null,
      notes: form.notes || null,
    })

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Investment added')
      setForm({
        type: defaultType, title: '', platform: '', amount: '',
        currency: 'NGN', unit_price: '', units: '',
        expected_return_pct: '', processing_fee: '',
        buy_date: new Date().toISOString().split('T')[0], notes: '',
      })
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            Add {form.type === 'mutual_fund' ? 'Mutual Fund' : 'Stock'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <Label className="text-zinc-400 text-xs">Type</Label>
            <select value={form.type} onChange={(e) => updateField('type', e.target.value)}
              className="w-full mt-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none">
              <option value="mutual_fund">Mutual Fund</option>
              <option value="stock">Stock</option>
            </select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Buy Date</Label>
            <Input type="date" value={form.buy_date} onChange={(e) => updateField('buy_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div className="col-span-2">
            <Label className="text-zinc-400 text-xs">Title / Fund Name</Label>
            <Input placeholder="e.g. STANBIC IBTC IMAAN FUND" value={form.title} onChange={(e) => updateField('title', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Platform</Label>
            <Input placeholder="e.g. Palmpay Mutual Funds" value={form.platform} onChange={(e) => updateField('platform', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Currency</Label>
            <select value={form.currency} onChange={(e) => updateField('currency', e.target.value)}
              className="w-full mt-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none">
              <option value="NGN">NGN (₦)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Amount Invested</Label>
            <Input type="number" step="any" placeholder="100000" value={form.amount} onChange={(e) => updateField('amount', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Processing Fee</Label>
            <Input type="number" step="any" placeholder="1500" value={form.processing_fee} onChange={(e) => updateField('processing_fee', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Expected Return %</Label>
            <Input type="number" step="any" placeholder="0.99" value={form.expected_return_pct} onChange={(e) => updateField('expected_return_pct', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
          {form.type === 'stock' && (
            <>
              <div>
                <Label className="text-zinc-400 text-xs">Unit Price</Label>
                <Input type="number" step="any" placeholder="92.50" value={form.unit_price} onChange={(e) => updateField('unit_price', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Amount of Units</Label>
                <Input type="number" step="any" placeholder="100" value={form.units} onChange={(e) => updateField('units', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
              </div>
            </>
          )}
          <div className="col-span-2">
            <Label className="text-zinc-400 text-xs">Notes (optional)</Label>
            <Input placeholder="Any additional notes..." value={form.notes} onChange={(e) => updateField('notes', e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm" />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading}
          className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? 'Saving...' : 'Add Investment'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}