import { Trade, MonthlySummary } from '@/hooks/useTrades'

export async function exportTradesToExcel(trades: Trade[], filename: string) {
  // Dynamically import to avoid SSR issues
  const XLSX = await import('xlsx')

  const wsData = trades.map((t, i) => ({
    '#': i + 1,
    Date: t.date,
    Name: t.name,
    'Amount (USD)': t.amount,
    Staked: t.staked,
    Leverage: t.leverage,
    Open: t.open_price,
    Close: t.close_price,
    'P/L': t.pl_type,
    '%P/L': t.pl_percentage,
    'Amt P/L': t.amount_pl,
    'LG/ST': t.lg_st,
    Hint: t.hint || '',
    Comments: t.comments || '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(wsData)

  // Set column widths
  ws['!cols'] = [
    { wch: 4 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
    { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 5 }, { wch: 8 },
    { wch: 10 }, { wch: 6 }, { wch: 20 }, { wch: 40 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Trades')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportTradesToPDF(trades: Trade[], summaries: MonthlySummary[], filename: string) {
  // Build a printable HTML document and trigger print/save as PDF
  const rows = trades
    .map(
      (t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${t.date}</td>
      <td>${t.name}</td>
      <td>$${t.amount.toFixed(2)}</td>
      <td>${t.leverage}</td>
      <td>${t.open_price}</td>
      <td>${t.close_price}</td>
      <td style="color:${t.pl_type === 'P' ? '#34d399' : '#f87171'}">${t.pl_type}</td>
      <td style="color:${t.pl_type === 'P' ? '#34d399' : '#f87171'}">${t.pl_percentage}%</td>
      <td style="color:${t.pl_type === 'P' ? '#34d399' : '#f87171'}">$${t.amount_pl.toFixed(4)}</td>
      <td>${t.lg_st}</td>
      <td>${t.hint || ''}</td>
      <td>${t.comments || ''}</td>
    </tr>`
    )
    .join('')

  const summaryRows = summaries
    .map(
      (s) => `
    <tr>
      <td>${s.label}</td>
      <td>${s.totalTrades}</td>
      <td>${s.profits}</td>
      <td>${s.losses}</td>
      <td>${s.winRate.toFixed(1)}%</td>
      <td style="color:${s.totalPL >= 0 ? '#34d399' : '#f87171'}">$${s.totalPL.toFixed(2)}</td>
    </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html><head><title>${filename}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; background: #fff; color: #000; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  h2 { font-size: 14px; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>LOWIN Trading Journal</h1>
<p>Generated: ${new Date().toLocaleDateString()}</p>
<h2>Monthly Summary</h2>
<table>
  <tr><th>Month</th><th>Trades</th><th>Wins</th><th>Losses</th><th>Win Rate</th><th>Net P/L</th></tr>
  ${summaryRows}
</table>
<h2>All Trades</h2>
<table>
  <tr><th>#</th><th>Date</th><th>Name</th><th>Amount</th><th>Lev</th><th>Open</th><th>Close</th><th>P/L</th><th>%</th><th>Amt P/L</th><th>Dir</th><th>Hint</th><th>Comments</th></tr>
  ${rows}
</table>
</body></html>`

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }
}