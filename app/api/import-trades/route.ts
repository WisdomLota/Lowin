import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('type') as string // 'demo' or 'daily'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Dynamically import xlsx
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

    const trades: any[] = []

    if (fileType === 'demo') {
      // realTradingDemo format:
      // [DATE, NAME, AMT stkd, LEV, OPEN, CLOSE, P/L, %P/L, AMT P/L, LG/ST, COMMENTS]
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || !row[0] || !row[1] || row[4] === undefined || row[4] === null) continue

        const dateStr = String(row[0])
        // Skip separator/summary rows
        if (!dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) continue

        const openPrice = parseFloat(row[4])
        if (isNaN(openPrice)) continue

        // Parse date DD/MM/YY -> YYYY-MM-DD
        const [d, m, y] = dateStr.split('/')
        const year = parseInt(y) < 100 ? 2000 + parseInt(y) : parseInt(y)
        const date = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`

        trades.push({
          date,
          name: String(row[1]).toUpperCase(),
          amount: parseFloat(row[2]) || 0,
          staked: parseFloat(row[2]) || 0,
          leverage: String(row[3] || '10X'),
          open_price: openPrice,
          close_price: parseFloat(row[5]) || 0,
          pl_type: String(row[6] || 'P').toUpperCase(),
          pl_percentage: parseFloat(row[7]) || 0,
          amount_pl: parseFloat(row[8]) || 0,
          lg_st: String(row[9] || 'ST').toUpperCase(),
          hint: null,
          comments: row[10] ? String(row[10]) : null,
        })
      }
    } else if (fileType === 'daily') {
      // realDailyTrades format:
      // [DATE, COIN, ENTRY P, EXIT P, ENTRY T, EXIT T, P/L %, P/L AMT, LEV, AMT STKD, LG/ST, Reason, COMMENTS]
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || !row[0] || !row[1] || row[2] === undefined || row[2] === null) continue

        const dateStr = String(row[0])
        if (!dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) continue

        const openPrice = parseFloat(row[2])
        if (isNaN(openPrice)) continue

        const [d, m, y] = dateStr.split('/')
        const year = parseInt(y) < 100 ? 2000 + parseInt(y) : parseInt(y)
        const date = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`

        const closePrice = parseFloat(row[3]) || 0
        const direction = String(row[10] || 'ST').toUpperCase()

        // Infer P/L type from direction and price movement
        let plType: string
        if (direction === 'LG') {
          plType = closePrice > openPrice ? 'P' : 'L'
        } else {
          plType = closePrice < openPrice ? 'P' : 'L'
        }

        trades.push({
          date,
          name: String(row[1]).toUpperCase(),
          amount: parseFloat(row[9]) || 0,
          staked: parseFloat(row[9]) || 0,
          leverage: String(row[8] || '10X'),
          open_price: openPrice,
          close_price: closePrice,
          pl_type: plType,
          pl_percentage: parseFloat(row[6]) || 0,
          amount_pl: parseFloat(row[7]) || 0,
          lg_st: direction,
          hint: row[11] ? String(row[11]) : null,
          comments: row[12] ? String(row[12]) : null,
        })
      }
    }

    return NextResponse.json({ trades, count: trades.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to parse file' }, { status: 500 })
  }
}