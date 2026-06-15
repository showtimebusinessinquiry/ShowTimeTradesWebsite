import { fetchQuote } from '@/lib/yahoo-finance'

const SYMBOLS = [
  'VIX', 'SPY', 'QQQ',
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL',
  'META', 'TSLA', 'JPM', 'V', 'COST',
  'XOM', 'UNH', 'LLY', 'AVGO', 'MA',
]

const YAHOO_SYMBOL: Record<string, string> = {
  VIX: '^VIX',
}

let _cache: { body: { tickers: { symbol: string; price: string; change: string }[] }; ts: number } | null = null

export async function GET() {
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
