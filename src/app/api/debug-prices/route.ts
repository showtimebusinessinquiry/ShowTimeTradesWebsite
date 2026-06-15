import { fetchQuote } from '@/lib/yahoo-finance'

export async function GET() {
  const finnhubKey = process.env.FINNHUB_API_KEY

  const [spyFinnhub, spyYahoo] = await Promise.all([
    finnhubKey
      ? fetch(`https://finnhub.io/api/v1/quote?symbol=SPY&token=${finnhubKey}`)
          .then(r => r.json())
          .catch(e => ({ error: String(e) }))
      : { error: 'FINNHUB_API_KEY not set' },
    fetch('https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=2d', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
      .then(r => r.json())
      .then(d => ({ price: d?.chart?.result?.[0]?.meta?.regularMarketPrice }))
      .catch(e => ({ error: String(e) })),
  ])

  const fetchQuoteResult = await fetchQuote('SPY').catch(e => ({ error: String(e) }))

  return Response.json({
    finnhubKeySet: !!finnhubKey,
    finnhubKeyPrefix: finnhubKey?.slice(0, 8),
    finnhubRaw: spyFinnhub,
    yahooRaw: spyYahoo,
    fetchQuoteResult,
  })
}
