import { NextResponse } from 'next/server'
import { fetchYahooYTD } from '@/lib/yahoo-finance'

export async function GET() {
  const ytdRaw = await fetchYahooYTD('SPY')
  const ytd = ytdRaw !== null ? parseFloat(ytdRaw.toFixed(2)) : null
  return NextResponse.json({ ytd })
}
