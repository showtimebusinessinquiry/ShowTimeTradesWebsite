'use client'

import { useState } from 'react'

interface Props {
  ticker: string
  size?: number
  className?: string
}

const BADGE_COLORS = [
  'bg-accent/20 text-accent',
  'bg-gain/20 text-gain',
  'bg-amber/20 text-amber',
  'bg-blue-500/20 text-blue-400',
  'bg-purple-500/20 text-purple-400',
  'bg-teal-500/20 text-teal-400',
]

function hashColor(ticker: string): string {
  let hash = 0
  for (let i = 0; i < ticker.length; i++) hash = ((hash << 5) - hash) + ticker.charCodeAt(i)
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length]
}

export function TickerLogo({ ticker, size = 20, className = '' }: Props) {
  const [imgError, setImgError] = useState(false)
  const isCash = ticker === 'CASH'

  if (isCash || imgError) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full font-bold flex-shrink-0 ${hashColor(ticker)} ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(8, Math.floor(size * 0.45)) }}
      >
        {ticker[0]}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://assets.parqet.com/logos/symbol/${ticker}?format=svg`}
      alt={ticker}
      width={size}
      height={size}
      className={`rounded-full object-contain flex-shrink-0 ${className}`}
      onError={() => setImgError(true)}
    />
  )
}
