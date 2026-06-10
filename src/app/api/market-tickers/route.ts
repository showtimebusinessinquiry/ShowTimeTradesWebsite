const SYMBOLS = [
  'VIX','SPY','QQQ',
  'AAPL','MSFT','NVDA','AMZN','GOOGL',
  'META','TSLA','JPM','V','COST',
  'XOM','UNH','LLY','AVGO','MA',
]

// Yahoo Finance uses different symbols for some tickers
const YAHOO_SYMBOL: Record<string, string> = {
  VIX: '^VIX',
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
}

async function fetchSymbol(symbol: string): Promise<{ symbol: string; price: string; change: string } | null> {
  const yahooSymbol = YAHOO_SYMBOL[symbol] ?? symbol
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=2d`,
      { headers: HEADERS, next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta) return null
    const price: number = meta.regularMarketPrice ?? 0
    const prevClose: number = meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? price
    if (!price) return null
    const change = ((price - prevClose) / prevClose) * 100
    return {
      symbol,
      price: price.toFixed(2),
      change: change.toFixed(2),
    }
  } catch {
    return null
  }
}

export async function GET() {
  const results = await Promise.all(SYMBOLS.map(fetchSymbol))
  const tickers = results.filter((r): r is NonNullable<typeof r> => r !== null)
  return Response.json({ tickers })
}
