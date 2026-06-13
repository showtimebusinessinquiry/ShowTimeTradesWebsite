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

export async function GET() {
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
  return Response.json({ tickers })
}
