// Server-side proxy to Yahoo Finance — avoids browser CORS restrictions entirely.
// Tries v8 chart first, then v7 quote API as fallback for small-cap/micro-cap symbols.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
}

interface Quote {
  symbol: string
  price: number
  change: number
  changePct: number
  volume: number
}

async function fetchV8(symbol: string): Promise<Quote | null> {
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } })
      if (!res.ok) continue
      const json = await res.json()
      const meta = json?.chart?.result?.[0]?.meta
      if (!meta) continue
      const price: number = meta.regularMarketPrice
      const prevClose: number = meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? price
      const volume: number = meta.regularMarketVolume ?? 0
      if (!price) continue
      return {
        symbol,
        price,
        change: price - prevClose,
        changePct: ((price - prevClose) / prevClose) * 100,
        volume,
      }
    } catch { continue }
  }
  return null
}

async function fetchV7(symbol: string): Promise<Quote | null> {
  const urls = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketVolume`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketVolume`,
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } })
      if (!res.ok) continue
      const json = await res.json()
      const result = json?.quoteResponse?.result?.[0]
      if (!result) continue
      const price: number = result.regularMarketPrice
      const prevClose: number = result.regularMarketPreviousClose ?? price
      const volume: number = result.regularMarketVolume ?? 0
      if (!price) continue
      return {
        symbol,
        price,
        change: price - prevClose,
        changePct: ((price - prevClose) / prevClose) * 100,
        volume,
      }
    } catch { continue }
  }
  return null
}

async function fetchQuote(symbol: string): Promise<Quote | null> {
  const result = (await fetchV8(symbol)) ?? (await fetchV7(symbol))
  if (!result) {
    console.error(`[stock-quotes] No price data for symbol: ${symbol}`)
  }
  return result
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbolsParam = searchParams.get('symbols') ?? ''
  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z0-9.^=\-]{1,10}$/.test(s))
  if (symbols.length === 0) return Response.json({ quotes: [] })
  const results = await Promise.all(symbols.map(fetchQuote))
  const quotes = results.filter((r): r is Quote => r !== null)
  return Response.json({ quotes })
}
