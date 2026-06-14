import { NextResponse } from 'next/server'
import { fetchYahooYTD } from '@/lib/yahoo-finance'

export const revalidate = 3600 // cache response for 1 hour

export async function GET() {
  const ytd = await fetchYahooYTD('SPY')
  return NextResponse.json({ ytd: ytd !== null ? parseFloat(ytd.toFixed(2)) : null })
}
