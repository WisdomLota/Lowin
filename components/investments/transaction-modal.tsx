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

interface TransactionModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (tx: any) => Promise<{ error: string | null }>
  investmentId: string
  investmentTitle: string
  defaultType: 'deposit' | 'withdrawal' | 'value_update'
  currentValue?: number
}

export function TransactionModal({ open, onClose, onSubmit, investmentId, investmentTitle, defaultType, currentValue }: TransactionModalProps) {
  const [loading, setLoading] = useState(false)
  const [txType, setTxType] = useState(defaultType)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [fee, setFee] = useState('')

  async function handleSubmit() {
    if (!amount) {
      toast.error('Amount is required')
      return
    }

    if (txType === 'withdrawal' && currentValue !== undefined && parseFloat(amount) > currentValue) {
      toast.error(`Cannot withdraw more than current value (${currentValue.toLocaleString()})`)
      setLoading(false)
      return
    }

    setLoading(true)

    const result = await onSubmit({
      investment_id: investmentId,
      type: txType,
      amount: parseFloat(amount),
      date,
      notes: notes || null,
    })

    // If there's a fee on a deposit, also update the investment's processing_fee
    if (!result.error && fee && parseFloat(fee) > 0 && txType === 'deposit') {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: inv } = await supabase.from('investments').select('processing_fee').eq('id', investmentId).single()
      if (inv) {
        await supabase.from('investments').update({
          processing_fee: (inv.processing_fee || 0) + parseFloat(fee)
        }).eq('id', investmentId)
      }
    }

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      const labels = { deposit: 'Deposit recorded', withdrawal: 'Withdrawal recorded', value_update: 'Value updated' }
      toast.success(labels[txType])
      setAmount('')
      setFee('')
      setNotes('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#1a0f00] border-[#874708]/20 text-white max-w-sm!">
        <DialogHeader>
          <DialogTitle className="text-white text-sm">
            {txType === 'value_update' ? 'Update Value' : txType === 'withdrawal' ? 'Record Withdrawal' : 'Add Deposit'} — {investmentTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-zinc-400 text-xs">Action</Label>
            <select value={txType} onChange={(e) => setTxType(e.target.value as any)}
              className="w-full mt-1 rounded-md bg-[#2a1a00] border border-[#874708]/30 text-white text-sm px-3 py-2 outline-none">
              <option value="value_update">Update Current Value</option>
              <option value="deposit">Additional Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">
              {txType === 'value_update' ? 'Current Value (from your app)' : 'Amount'}
            </Label>
            <Input type="number" step="any" placeholder="105000" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-[#2a1a00] border-[#874708]/30 text-white mt-1 text-sm" />
          </div>
          {txType === 'withdrawal' && currentValue !== undefined && (
            <p className="text-xs text-zinc-500 -mt-1">
              Available: {currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          )}
          <div>
            <Label className="text-zinc-400 text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="bg-[#2a1a00] border-[#874708]/30 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Processing Fee</Label>
            <Input type="number" step="any" placeholder="0" value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="bg-[#2a1a00] border-[#874708]/30 text-white mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Notes (optional)</Label>
            <Input placeholder="Optional note..." value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-[#2a1a00] border-[#874708]/30 text-white mt-1 text-sm" />
          </div>

          <Button onClick={handleSubmit} disabled={loading}
            className="w-full bg-[#FF8D19] hover:bg-[#e67d15] text-white">
            {loading ? 'Saving...' : 'Submit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}