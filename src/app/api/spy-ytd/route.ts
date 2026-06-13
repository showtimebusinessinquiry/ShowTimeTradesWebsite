import { NextResponse } from 'next/server'

export const revalidate = 3600 // cache response for 1 hour

// In-memory guard — prevents repeated external hits during dev hot-reloads
let _memo: { ytd: number | null; ts: number } | null = null

async function fetchSPYYtd(): Promise<number | null> {
  if (_memo && Date.now() - _memo.ts < 300_000) return _memo.ytd // 5-min dev cache

  const jan1 = new Date(new Date().getFullYear(), 0, 1)
  const jan1Unix = Math.floor(jan1.getTime() / 1000)
  const nowUnix = Math.floor(Date.now() / 1000)

  const yahooHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://finance.yahoo.com/',
  }

  // Yahoo Finance v8 — query2 (different CDN, lower rate limit)
  for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
    try {
      const res = await fetch(
        `https://${host}/v8/finance/chart/SPY?range=ytd&interval=1d`,
        { headers: yahooHeaders, cache: 'no-store' },
      )
      if (res.ok) {
        const json = await res.json()
        const closes: (number | null)[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
        const valid = closes.filter((c): c is number => c !== null)
        if (valid.length >= 2) {
          const ytd = parseFloat((((valid.at(-1)! - valid[0]) / valid[0]) * 100).toFixed(2))
          _memo = { ytd, ts: Date.now() }
          return ytd
        }
      }
    } catch { /* try next */ }
  }

  // Finnhub candle — last resort
  const key = process.env.FINNHUB_API_KEY
  if (key) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/stock/candle?symbol=SPY&resolution=D&from=${jan1Unix}&to=${nowUnix}&token=${key}`,
        { cache: 'no-store' },
      )
      if (res.ok) {
        const data = await res.json()
        if (data.s === 'ok' && data.c?.length >= 2) {
          const ytd = parseFloat((((data.c.at(-1) - data.c[0]) / data.c[0]) * 100).toFixed(2))
          _memo = { ytd, ts: Date.now() }
          return ytd
        }
      }
    } catch { /* fall through */ }
  }

  _memo = { ytd: null, ts: Date.now() }
  return null
}

export async function GET() {
  const ytd = await fetchSPYYtd()
  return NextResponse.json({ ytd })
}
