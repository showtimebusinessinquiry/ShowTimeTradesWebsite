const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePct: number
  volume: number
}

// --- Crumb cache ---

let crumbCache: { crumb: string; cookie: string; expiresAt: number } | null = null

async function getCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (crumbCache && Date.now() < crumbCache.expiresAt) return crumbCache
  try {
    const r1 = await fetch('https://finance.yahoo.com/', {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    })
    // getSetCookie() is Node 18+; fall back to get() for older runtimes
    const cookieHeader =
      (typeof r1.headers.getSetCookie === 'function' ? r1.headers.getSetCookie().join('; ') : null) ??
      r1.headers.get('set-cookie') ??
      ''

    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookieHeader },
    })
    if (!r2.ok) return null
    const crumb = (await r2.text()).trim()
    if (!crumb || crumb.includes('<')) return null // HTML error page guard
    crumbCache = { crumb, cookie: cookieHeader, expiresAt: Date.now() + 3_600_000 }
    return crumbCache
  } catch {
    return null
  }
}

// --- Yahoo Finance quote ---

async function fetchYahooV8(symbol: string, crumb: string, cookie: string): Promise<StockQuote | null> {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']
  for (const host of hosts) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d&crumb=${encodeURIComponent(crumb)}`
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json', Cookie: cookie },
        next: { revalidate: 60 },
      })
      if (!res.ok) continue
      const json = await res.json()
      const meta = json?.chart?.result?.[0]?.meta
      if (!meta?.regularMarketPrice) continue
      const price: number = meta.regularMarketPrice
      const prevClose: number = meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? price
      return {
        symbol,
        price,
        change: price - prevClose,
        changePct: ((price - prevClose) / prevClose) * 100,
        volume: meta.regularMarketVolume ?? 0,
      }
    } catch { continue }
  }
  return null
}

export async function fetchYahooQuote(symbol: string): Promise<StockQuote | null> {
  const auth = await getCrumb()
  if (!auth) return null
  return fetchYahooV8(symbol, auth.crumb, auth.cookie)
}

// --- Yahoo Finance YTD historical ---

export async function fetchYahooYTD(symbol: string): Promise<number | null> {
  const auth = await getCrumb()
  if (!auth) return null
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=ytd&crumb=${encodeURIComponent(auth.crumb)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json', Cookie: auth.cookie },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const json = await res.json()
    const closes: (number | null)[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    const valid = closes.filter((c): c is number => c !== null)
    if (valid.length < 2) return null
    return ((valid.at(-1)! - valid[0]) / valid[0]) * 100
  } catch {
    return null
  }
}

// --- Finnhub fallback ---

async function fetchFinnhubQuote(symbol: string): Promise<StockQuote | null> {
  const key = process.env.FINNHUB_API_KEY
  if (!key) return null
  // Finnhub doesn't support Yahoo-style index symbols like ^VIX
  if (symbol.startsWith('^')) return null
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.c) return null
    return {
      symbol,
      price: data.c,
      change: data.d ?? 0,
      changePct: data.dp ?? 0,
      volume: 0,
    }
  } catch {
    return null
  }
}

// --- Public entry point ---

export async function fetchQuote(symbol: string): Promise<StockQuote | null> {
  return (await fetchYahooQuote(symbol)) ?? (await fetchFinnhubQuote(symbol))
}
