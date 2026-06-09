import { NextRequest } from 'next/server'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
}

async function fetchPrice(symbol: string): Promise<{ symbol: string; price: number; change: number } | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
      { headers: HEADERS, next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta) return null
    const price: number = meta.regularMarketPrice
    const prevClose: number = meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? price
    if (!price) return null
    const change = ((price - prevClose) / prevClose) * 100
    return { symbol, price: parseFloat(price.toFixed(2)), change: parseFloat(change.toFixed(2)) }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get('symbols') ?? ''
  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0 && s !== 'CASH')
    .slice(0, 30)

  if (symbols.length === 0) return Response.json({ quotes: [] })

  const results = await Promise.all(symbols.map(fetchPrice))
  const quotes = results.filter((r): r is NonNullable<typeof r> => r !== null)
  return Response.json({ quotes })
}
