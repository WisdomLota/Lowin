'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ImportTradesModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportTradesModal({ open, onClose, onSuccess }: ImportTradesModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'demo' | 'daily'>('demo')
  const [tradeMode, setTradeMode] = useState<'demo' | 'real'>('real')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any[] | null>(null)

  async function handlePreview() {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', fileType)

    try {
      const res = await fetch('/api/import-trades', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.error) {
        toast.error(data.error)
        setLoading(false)
        return
      }

      setPreview(data.trades)
      toast.success(`Parsed ${data.count} trades`)
    } catch {
      toast.error('Failed to parse file')
    }

    setLoading(false)
  }

  async function handleImport() {
    if (!preview || preview.length === 0) return

    setLoading(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Not authenticated')
      setLoading(false)
      return
    }

    // Insert in batches of 50
    const batchSize = 50
    let imported = 0

    for (let i = 0; i < preview.length; i += batchSize) {
      const batch = preview.slice(i, i + batchSize).map((trade) => ({
        ...trade,
        user_id: user.id,
        trade_mode: tradeMode,
      }))

      const { error } = await supabase.from('trades').insert(batch)

      if (error) {
        toast.error(`Error at batch ${i}: ${error.message}`)
        setLoading(false)
        return
      }

      imported += batch.length
    }

    toast.success(`Successfully imported ${imported} trades`)
    setPreview(null)
    setFile(null)
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg!">
        <DialogHeader>
          <DialogTitle className="text-white">Import Trades from Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-zinc-400 text-sm">File Format</Label>
            <select
              value={fileType}
              onChange={(e) => { setFileType(e.target.value as any); setPreview(null) }}
              className="w-full mt-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none"
            >
              <option value="demo">
                Trading Demo (DATE, NAME, AMT, LEV, OPEN, CLOSE, P/L, %P/L, AMT P/L, LG/ST, COMMENTS)
              </option>
              <option value="daily">
                Daily Trades (DATE, COIN, ENTRY P, EXIT P, ..., P/L %, P/L AMT, LEV, AMT STKD, LG/ST, Reason, COMMENTS)
              </option>
            </select>
          </div>

          <div>
            <Label className="text-zinc-400 text-sm">Trade Mode</Label>
            <select
              value={tradeMode}
              onChange={(e) => setTradeMode(e.target.value as any)}
              className="w-full mt-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none"
            >
              <option value="real">Real Trades</option>
              <option value="demo">Demo Trades</option>
            </select>
          </div>

          <div>
            <Label className="text-zinc-400 text-sm">Excel File (.xlsx)</Label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null) }}
              className="w-full mt-1 text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700"
            />
          </div>

          {!preview ? (
            <Button
              onClick={handlePreview}
              disabled={!file || loading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              {loading ? 'Parsing...' : 'Preview Import'}
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Preview summary */}
              <div className="rounded-lg bg-zinc-800 p-3">
                <p className="text-sm text-zinc-300">
                  Found <span className="text-white font-semibold">{preview.length}</span> trades
                </p>
                <div className="mt-2 max-h-40 overflow-y-auto text-xs space-y-1">
                  {preview.slice(0, 10).map((t, i) => (
                    <div key={i} className="flex justify-between text-zinc-400">
                      <span>{t.date} — {t.name}</span>
                      <span className={t.pl_type === 'P' ? 'text-emerald-400' : 'text-red-400'}>
                        {t.pl_type} {t.pl_percentage}% (${t.amount_pl.toFixed(4)})
                      </span>
                    </div>
                  ))}
                  {preview.length > 10 && (
                    <p className="text-zinc-500">...and {preview.length - 10} more</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setPreview(null)}
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loading ? 'Importing...' : `Import ${preview.length} Trades`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}