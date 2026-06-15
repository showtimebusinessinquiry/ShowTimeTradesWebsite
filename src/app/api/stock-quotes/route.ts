import { fetchQuote } from '@/lib/yahoo-finance'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbolsParam = searchParams.get('symbols') ?? ''
  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => /^[A-Z0-9.^=\-]{1,10}$/.test(s))

  if (symbols.length === 0) return Response.json({ quotes: [] })
  if (symbols.length > 20) return Response.json({ error: 'Too many symbols' }, { status: 400 })

  const results = await Promise.all(symbols.map(fetchQuote))
  const quotes = results.filter((r): r is NonNullable<typeof r> => r !== null)
  return Response.json({ quotes })
}
