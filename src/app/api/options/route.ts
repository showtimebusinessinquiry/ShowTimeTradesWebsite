import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
}

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const ticker = searchParams.get('ticker')?.toUpperCase()
  const expiration = searchParams.get('expiration') // YYYY-MM-DD
  const strikeParam = searchParams.get('strike')
  const type = searchParams.get('type') // 'put' for CSP, 'call' for CC

  if (!ticker) return Response.json({ error: 'ticker required' }, { status: 400 })
  if (!/^[A-Z0-9.^=\-]{1,10}$/.test(ticker)) return Response.json({ error: 'Invalid symbol' }, { status: 400 })
  if (type !== null && type !== 'call' && type !== 'put') {
    return Response.json({ error: "type must be 'call' or 'put'" }, { status: 400 })
  }
  if (expiration !== null && !/^\d{4}-\d{2}-\d{2}$/.test(expiration)) {
    return Response.json({ error: 'Invalid expiration format' }, { status: 400 })
  }

  // Convert YYYY-MM-DD to epoch seconds for Yahoo Finance options endpoint.
  // Use local noon to avoid UTC midnight crossing a day boundary in non-UTC timezones.
  const epochParam = expiration
    ? (() => {
        const [y, m, d] = expiration.split('-').map(Number)
        const local = new Date(y, m - 1, d, 12, 0, 0)
        return `?date=${Math.floor(local.getTime() / 1000)}`
      })()
    : ''

  const urls = [
    `https://query1.finance.yahoo.com/v7/finance/options/${ticker}${epochParam}`,
    `https://query2.finance.yahoo.com/v7/finance/options/${ticker}${epochParam}`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } })
      if (!res.ok) continue
      const json = await res.json()
      const result = json?.optionChain?.result?.[0]
      if (!result?.options?.[0]) continue

      const chain = result.options[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contracts: any[] = type === 'call' ? (chain.calls ?? []) : (chain.puts ?? [])

      if (!strikeParam) {
        return Response.json({ expirationDates: result.expirationDates, count: contracts.length })
      }

      const targetStrike = parseFloat(strikeParam)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = contracts.reduce((best: any, c: any) => {
        if (!best) return c
        return Math.abs((c.strike ?? 0) - targetStrike) < Math.abs((best.strike ?? 0) - targetStrike) ? c : best
      }, null)

      if (!match) return Response.json({ error: 'strike not found' }, { status: 404 })

      const mark =
        match.bid != null && match.ask != null
          ? parseFloat(((match.bid + match.ask) / 2).toFixed(2))
          : match.lastPrice ?? null

      return Response.json({
        strike: match.strike ?? null,
        bid: match.bid ?? null,
        ask: match.ask ?? null,
        mark,
        lastPrice: match.lastPrice ?? null,
        iv: match.impliedVolatility ?? null,
        volume: match.volume ?? null,
        openInterest: match.openInterest ?? null,
        inTheMoney: match.inTheMoney ?? null,
      })
    } catch {
      continue
    }
  }

  return Response.json({ error: 'options data unavailable' }, { status: 503 })
}
