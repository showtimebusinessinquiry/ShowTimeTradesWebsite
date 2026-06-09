import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=ytd',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 86400 },
      }
    )
    if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`)
    const json = await res.json()
    const closes: (number | null)[] = json.chart.result[0].indicators.quote[0].close
    const valid = closes.filter((c): c is number => c !== null)
    if (valid.length < 2) throw new Error('Insufficient price data')
    const ytd = ((valid.at(-1)! - valid[0]) / valid[0]) * 100
    return NextResponse.json({ ytd: parseFloat(ytd.toFixed(2)) })
  } catch {
    return NextResponse.json({ ytd: null }, { status: 200 })
  }
}
