'use client'

import { useEffect, useState } from 'react'

interface TickerItem {
  symbol: string
  price: string
  change: string
}

export function TickerBanner() {
  const [tickers, setTickers] = useState<TickerItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/market-tickers', { signal: controller.signal })
      .then(r => r.json())
      .then((d: { tickers: TickerItem[] }) => {
        setTickers(d.tickers ?? [])
        setLoaded(true)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoaded(true)
      })
    return () => controller.abort()
  }, [])

  if (!loaded) {
    return (
      <div className="h-8 bg-surface border-b border-default flex items-center px-6">
        <div className="text-xs text-text-muted animate-pulse tracking-widest">Loading market data...</div>
      </div>
    )
  }

  if (tickers.length === 0) {
    return (
      <div className="h-8 bg-surface border-b border-default flex items-center px-6">
        <div className="text-xs text-text-muted/50 tracking-widest">Market data unavailable</div>
      </div>
    )
  }

  return (
    <div className="h-8 bg-surface border-b border-default overflow-hidden flex items-center select-none">
      {[0, 1].map(copy => (
        <div
          key={copy}
          aria-hidden={copy === 1 || undefined}
          className="flex items-center gap-8 animate-ticker shrink-0 min-w-max will-change-transform"
          style={{ whiteSpace: 'nowrap' }}
        >
          {tickers.map((t, i) => {
            const changeNum = parseFloat(t.change)
            const isPos = changeNum >= 0
            return (
              <span key={i} className="text-xs font-mono flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
                <span className="text-text-secondary font-semibold tracking-wider">{t.symbol}</span>
                <span className="text-text-muted">${t.price}</span>
                <span className={isPos ? 'text-gain' : 'text-loss'}>
                  {isPos ? '+' : ''}{t.change}%
                </span>
                <span className="text-text-muted opacity-50 ml-2">·</span>
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
