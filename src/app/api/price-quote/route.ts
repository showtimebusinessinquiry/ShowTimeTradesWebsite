import { NextRequest } from 'next/server'
import { fetchQuote } from '@/lib/yahoo-finance'

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get('symbols') ?? ''
  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => /^[A-Z0-9.^=\-]{1,10}$/.test(s))

  if (symbols.length === 0) return Response.json({ quotes: [] })

  const results = await Promise.all(symbols.map(fetchQuote))
  const quotes = results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map(q => ({ symbol: q.symbol, price: parseFloat(q.price.toFixed(2)), change: parseFloat(q.changePct.toFixed(2)) }))
  return Response.json({ quotes })
}
