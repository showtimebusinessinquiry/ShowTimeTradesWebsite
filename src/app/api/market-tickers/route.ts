import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { fetchQuote } from '@/lib/yahoo-finance'

const SYMBOLS = [
  'VIX', 'SPY', 'QQQ',
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL',
  'META', 'TSLA', 'JPM', 'V', 'COST',
  'XOM', 'UNH', 'LLY', 'AVGO', 'MA',
]

// Yahoo Finance uses different symbols for some tickers
const YAHOO_SYMBOL: Record<string, string> = {
  VIX: '^VIX',
}

// Module-level in-memory cache with 60-second TTL
let _cache: { body: { tickers: { symbol: string; price: string; change: string }[] }; ts: number } | null = null

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (_cache && Date.now() - _cache.ts < 60_000) {
    return Response.json(_cache.body)
  }

  const results = await Promise.all(
    SYMBOLS.map(async symbol => {
      const quote = await fetchQuote(YAHOO_SYMBOL[symbol] ?? symbol)
      if (!quote) return null
      return {
        symbol,
        price: quote.price.toFixed(2),
        change: quote.changePct.toFixed(2),
      }
    }),
  )
  const tickers = results.filter((r): r is NonNullable<typeof r> => r !== null)
  const body = { tickers }
  _cache = { body, ts: Date.now() }
  return Response.json(body)
}
