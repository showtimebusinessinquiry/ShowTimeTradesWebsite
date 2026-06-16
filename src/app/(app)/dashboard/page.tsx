'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Trade, PortfolioPosition } from '@/types/database'
import { STRATEGY_LABELS } from '@/types/database'
import { MetricCard } from '@/components/ui/MetricCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { TickerLogo } from '@/components/ui/TickerLogo'
import Link from 'next/link'
import {
  calcWinRate, calcTotalPnl, calcAvgROC, calcUnrealizedPnl,
  calcMaxDrawdown, calcProfitFactor, calcExpectancy, calcAvgGain, calcAvgLoss,
  calcBestWorstDay, calcKelly, calcAvgHoldingPeriod,
} from '@/utils/calculations'
import { MISTAKE_TAGS } from '@/lib/constants'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'

type DateRange = '1W' | '1M' | '3M' | 'YTD' | 'ALL'

function filterByRange(trades: Trade[], range: DateRange): Trade[] {
  if (range === 'ALL') return trades
  const cutoff = new Date()
  if (range === '1W') cutoff.setDate(cutoff.getDate() - 7)
  else if (range === '1M') cutoff.setMonth(cutoff.getMonth() - 1)
  else if (range === '3M') cutoff.setMonth(cutoff.getMonth() - 3)
  else if (range === 'YTD') cutoff.setMonth(0, 1)
  return trades.filter(t => new Date(t.date) >= cutoff)
}

const CHART_COLORS = {
  gain: '#00e676',
  loss: '#ff3d57',
  accent: '#ff4444',
  muted: '#4a5568',
  surface: '#1f2535',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface2 border border-default p-3 text-xs rounded-lg shadow-lg">
      <div className="text-text-muted mb-1">{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? (p.value >= 0 ? '+' : '') + '$' + p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-surface2 border border-default rounded-lg px-3 py-2 shadow-lg">
      <div className="text-sm font-bold text-text-primary mb-0.5">{name}</div>
      <div className="text-xs font-mono text-text-secondary">{value} trade{value !== 1 ? 's' : ''}</div>
    </div>
  )
}

function getEdgeRank(score: number): { label: string; color: string } {
  if (score < 20) return { label: 'Gambler',     color: '#ff3d57' }
  if (score < 40) return { label: 'Speculator',  color: '#f59e0b' }
  if (score < 60) return { label: 'Trader',      color: '#fbbf24' }
  if (score < 80) return { label: 'Tactician',   color: '#4ade80' }
  return               { label: 'Market Maker', color: '#00e676' }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [trades, setTrades] = useState<Trade[]>([])
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [spyYtd, setSpyYtd] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>('ALL')
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const [pricesLoading, setPricesLoading] = useState(false)
  const [upcomingEarnings, setUpcomingEarnings] = useState<Array<{ symbol: string; earnings_date: string }>>([])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    const today = new Date().toLocaleDateString('en-CA')
    const in14 = new Date(Date.now() + 14 * 86_400_000).toLocaleDateString('en-CA')
    supabase
      .from('watchlist')
      .select('ticker, earnings_date')
      .eq('user_id', user.id)
      .gte('earnings_date', today)
      .lte('earnings_date', in14)
      .order('earnings_date')
      .then(({ data }) => {
        if (data) setUpcomingEarnings(data.map(r => ({ symbol: r.ticker, earnings_date: r.earnings_date as string })))
      })
  }, [user])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    Promise.all([
      supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .then(({ data, error }) => {
          if (error) console.error('[Dashboard] trades fetch error:', error.message)
          return (data ?? []) as Trade[]
        }),
      supabase
        .from('portfolio_positions')
        .select('*')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (error) console.error('[Dashboard] positions fetch error:', error.message)
          return (data ?? []) as PortfolioPosition[]
        }),
      fetch('/api/spy-ytd')
        .then(r => r.json())
        .then((d: { ytd: number | null }) => d.ytd)
        .catch(() => null),
    ]).then(([tradesData, positionsData, spyData]) => {
      setTrades(tradesData)
      setPositions(positionsData)
      setSpyYtd(spyData)
      setLoading(false)
    })
  }, [user])

  useEffect(() => {
    const tickers = [...new Set([
      ...trades.filter(t => t.exit_price === null).map(t => t.ticker),
      ...positions.map(p => p.ticker),
    ])]
    if (tickers.length === 0) return
    setPricesLoading(true)
    fetch(`/api/stock-quotes?symbols=${tickers.join(',')}`)
      .then(r => r.json())
      .then((d: { quotes: Array<{ symbol: string; price: number }> }) => {
        const map: Record<string, number> = {}
        d.quotes.forEach(q => { map[q.symbol] = q.price })
        setLivePrices(map)
      })
      .catch(() => {})
      .finally(() => setPricesLoading(false))
  }, [trades, positions])

  const filtered = useMemo(() => filterByRange(trades, range), [trades, range])
  const closedTrades = useMemo(() => filtered.filter(t => t.pnl !== null), [filtered])
  const openTrades = useMemo(
    () => trades.filter(t => t.exit_price === null).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [trades]
  )

  const tradeResults = useMemo(() => closedTrades.map(t => ({ pnl: t.pnl ?? 0 })), [closedTrades])
  const totalRealizedPnl = useMemo(() => calcTotalPnl(tradeResults), [tradeResults])
  const winRate = useMemo(() => calcWinRate(tradeResults), [tradeResults])
  const avgROC = useMemo(() => calcAvgROC(filtered), [filtered])
  const openPnl = useMemo(
    () => positions.reduce((sum, p) => {
      const cur = p.ticker === 'CASH' ? 1
        : p.asset_type === 'option' ? (p.current_price ?? p.entry_price)
        : (livePrices[p.ticker] ?? p.entry_price)
      return sum + calcUnrealizedPnl(p.entry_price, cur, p.quantity)
    }, 0),
    [positions, livePrices]
  )
  const maxDrawdown = useMemo(() => calcMaxDrawdown(tradeResults), [tradeResults])
  const profitFactor = useMemo(() => calcProfitFactor(tradeResults), [tradeResults])
  const expectancy = useMemo(() => calcExpectancy(tradeResults), [tradeResults])
  const avgGain = useMemo(() => calcAvgGain(tradeResults), [tradeResults])
  const avgLoss = useMemo(() => calcAvgLoss(tradeResults), [tradeResults])

  const bestWorstDay = useMemo(
    () => calcBestWorstDay(closedTrades.map(t => ({ date: t.date, pnl: t.pnl ?? 0 }))),
    [closedTrades],
  )
  const kelly = useMemo(() => calcKelly(winRate, avgGain, avgLoss), [winRate, avgGain, avgLoss])
  const avgHold = useMemo(
    () => calcAvgHoldingPeriod(closedTrades.map(t => ({ date: t.date, close_date: t.close_date }))),
    [closedTrades],
  )

  const streak = useMemo(() => {
    if (closedTrades.length === 0) return { count: 0, type: null as 'win' | 'loss' | null }
    const lastPnl = closedTrades[closedTrades.length - 1].pnl ?? 0
    const type: 'win' | 'loss' = lastPnl > 0 ? 'win' : 'loss'
    let count = 0
    for (let i = closedTrades.length - 1; i >= 0; i--) {
      const pnl = closedTrades[i].pnl ?? 0
      if ((type === 'win' && pnl > 0) || (type === 'loss' && pnl < 0)) count++
      else break
    }
    return { count, type }
  }, [closedTrades])

  const avgPnlPct = useMemo(() => {
    const withPct = closedTrades.filter(t => t.pnl_pct !== null)
    if (withPct.length === 0) return 0
    return withPct.reduce((sum, t) => sum + (t.pnl_pct ?? 0), 0) / withPct.length
  }, [closedTrades])

  const avgDTE = useMemo(() => {
    const optsWithDTE = filtered.filter(t => t.asset_type === 'option' && t.exit_price !== null && t.dte !== null)
    if (optsWithDTE.length === 0) return null
    return Math.round(optsWithDTE.reduce((sum, t) => sum + (t.dte ?? 0), 0) / optsWithDTE.length)
  }, [filtered])

  const totalOpenCost = useMemo(
    () => positions.filter(p => p.ticker !== 'CASH').reduce((sum, p) => sum + p.entry_price * p.quantity, 0),
    [positions]
  )
  const realizedPct = useMemo(
    () => totalOpenCost > 0 ? (totalRealizedPnl / totalOpenCost) * 100 : 0,
    [totalOpenCost, totalRealizedPnl]
  )

  const cumulativeData = useMemo(() => {
    let cum = 0
    return closedTrades.map(t => {
      cum += t.pnl ?? 0
      return { date: t.date, pnl: parseFloat(cum.toFixed(2)) }
    })
  }, [closedTrades])

  const pnlGradientOffset = useMemo(() => {
    if (cumulativeData.length === 0) return 100
    const values = cumulativeData.map(d => d.pnl)
    const max = Math.max(...values)
    const min = Math.min(...values)
    if (max <= 0) return 0
    if (min >= 0) return 100
    return Math.min(100, Math.max(0, (max / (max - min)) * 100))
  }, [cumulativeData])

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {}
    closedTrades.forEach(t => {
      const month = t.date.slice(0, 7)
      map[month] = (map[month] ?? 0) + (t.pnl ?? 0)
    })
    return Object.entries(map).map(([month, pnl]) => ({ month, pnl: parseFloat(pnl.toFixed(2)) }))
  }, [closedTrades])

  const pieData = useMemo(() => {
    const wins = tradeResults.filter(t => t.pnl > 0).length
    const losses = tradeResults.filter(t => t.pnl < 0).length
    return [
      { name: 'Wins', value: wins },
      { name: 'Losses', value: losses },
    ]
  }, [tradeResults])

  const tickerData = useMemo(() => {
    const map: Record<string, number> = {}
    closedTrades.forEach(t => {
      map[t.ticker] = (map[t.ticker] ?? 0) + (t.pnl ?? 0)
    })
    return Object.entries(map)
      .map(([ticker, pnl]) => ({ ticker, pnl: parseFloat(pnl.toFixed(2)) }))
      .sort((a, b) => b.pnl - a.pnl)
  }, [closedTrades])

  const strategyData = useMemo(() => {
    const CHART_LABELS: Record<string, string> = {
      ...STRATEGY_LABELS,
      csp: 'Cash Secured Put',
      covered_call: 'Covered Calls',
      equity_long: 'Long Equity',
    }
    const map: Record<string, number> = {}
    closedTrades.forEach(t => {
      const key = t.strategy === 'portfolio_close' ? 'equity_long' : t.strategy
      map[key] = (map[key] ?? 0) + (t.pnl ?? 0)
    })
    return Object.entries(map)
      .map(([strategy, pnl]) => ({ strategy: CHART_LABELS[strategy] ?? strategy, pnl: parseFloat(pnl.toFixed(2)) }))
      .sort((a, b) => b.pnl - a.pnl)
  }, [closedTrades])

  const edgeScore = useMemo(() => {
    if (closedTrades.length < 3) return null

    const winScore = winRate * 100

    const pf = profitFactor === Infinity ? 3 : Math.min(profitFactor, 3)
    const pfScore = (pf / 3) * 100

    const monthlyMap: Record<string, number> = {}
    closedTrades.forEach(t => {
      const m = t.date.slice(0, 7)
      monthlyMap[m] = (monthlyMap[m] ?? 0) + (t.pnl ?? 0)
    })
    const months = Object.values(monthlyMap)
    const consistencyScore = (months.filter(p => p >= 0).length / months.length) * 100

    const grossProfit = tradeResults.filter(r => r.pnl > 0).reduce((s, r) => s + r.pnl, 0)
    const drawdownScore = grossProfit > 0
      ? Math.max(0, 100 - (Math.abs(maxDrawdown) / grossProfit) * 100)
      : maxDrawdown === 0 ? 100 : 0

    const hasWins = tradeResults.some(r => r.pnl > 0)
    const hasLosses = tradeResults.some(r => r.pnl < 0)
    const rawRatio = hasWins && hasLosses ? avgGain / Math.abs(avgLoss) : hasWins ? 3 : 0
    const winLossScore = Math.min((rawRatio / 3) * 100, 100)

    const rf = maxDrawdown !== 0 ? totalRealizedPnl / Math.abs(maxDrawdown) : totalRealizedPnl > 0 ? 5 : 0
    const recoveryScore = Math.min(Math.max((rf / 5) * 100, 0), 100)

    const composite = (winScore + pfScore + consistencyScore + drawdownScore + winLossScore + recoveryScore) / 6

    return {
      composite,
      axes: [
        { axis: 'Win %',        value: Math.round(winScore) },
        { axis: 'Profit Factor',value: Math.round(pfScore) },
        { axis: 'Consistency',  value: Math.round(consistencyScore) },
        { axis: 'Max Drawdown', value: Math.round(drawdownScore) },
        { axis: 'Avg Win/Loss', value: Math.round(winLossScore) },
        { axis: 'Recovery',     value: Math.round(recoveryScore) },
      ],
    }
  }, [closedTrades, winRate, profitFactor, maxDrawdown, totalRealizedPnl, tradeResults, avgGain, avgLoss])

  const mistakeData = useMemo(() => {
    const counts: Record<string, number> = {}
    const pnlByTag: Record<string, number> = {}
    trades.forEach(t => {
      (t.mistake_tags ?? []).forEach(tag => {
        counts[tag] = (counts[tag] ?? 0) + 1
        pnlByTag[tag] = (pnlByTag[tag] ?? 0) + (t.pnl ?? 0)
      })
    })
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count, pnl: pnlByTag[tag] ?? 0 }))
      .sort((a, b) => b.count - a.count)
  }, [trades])

  const fmt = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(2)}`
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        <div className="text-text-muted text-sm animate-pulse">Loading metrics…</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        subtitle={`${filtered.length} trades in range`}
        action={
          <div className="flex gap-1.5">
            {(['1W','1M','3M','YTD','ALL'] as DateRange[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-sm font-semibold px-5 py-2 rounded-full border transition-all ${
                  range === r
                    ? 'border-accent text-white bg-accent shadow-[0_0_14px_rgba(255,51,51,0.5)]'
                    : 'border-default text-text-secondary hover:text-text-primary hover:border-border hover:-translate-y-px btn-glow-subtle'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {/* Upcoming Earnings banner */}
      {upcomingEarnings.length > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-amber/5 border border-amber/20 rounded-xl px-4 py-3 flex-wrap">
          <span className="text-[10px] font-semibold text-amber tracking-[0.14em] uppercase flex-shrink-0">⚡ Upcoming Earnings</span>
          <div className="flex items-center gap-3 flex-wrap">
            {upcomingEarnings.map(e => (
              <span key={e.symbol} className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-text-primary font-mono">{e.symbol}</span>
                <span className="text-text-muted">{e.earnings_date}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Primary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
        <div className={totalRealizedPnl >= 0 ? 'rounded-xl shadow-[0_0_32px_rgba(0,230,118,0.07)]' : 'rounded-xl shadow-[0_0_32px_rgba(255,61,87,0.07)]'}>
          <MetricCard
            label="Realized P&L"
            value={fmt(totalRealizedPnl)}
            variant={totalRealizedPnl >= 0 ? 'gain' : 'loss'}
            size="lg"
            sub={`${closedTrades.length} closed · ${fmtPct(realizedPct)} vs cost`}
          />
        </div>
        <div className={openPnl >= 0 ? 'rounded-xl shadow-[0_0_32px_rgba(0,230,118,0.07)]' : 'rounded-xl shadow-[0_0_32px_rgba(255,61,87,0.07)]'}>
          <MetricCard
            label="Open P&L"
            value={fmt(openPnl)}
            variant={openPnl >= 0 ? 'gain' : 'loss'}
            size="lg"
            sub={`${positions.filter(p => p.ticker !== 'CASH').length} positions`}
            sub2="All open positions"
          />
        </div>
        <div className={winRate >= 0.5 ? 'rounded-xl shadow-[0_0_32px_rgba(0,230,118,0.07)]' : 'rounded-xl shadow-[0_0_32px_rgba(255,61,87,0.07)]'}>
          <MetricCard
            label="Win Rate"
            value={`${(winRate * 100).toFixed(1)}%`}
            variant={winRate >= 0.5 ? 'gain' : 'loss'}
            size="lg"
            sub={`${tradeResults.filter(t => t.pnl > 0).length}W / ${tradeResults.filter(t => t.pnl < 0).length}L${streak.count > 0 ? ` · ${streak.count}${streak.type === 'win' ? 'W' : 'L'} streak` : ''}`}
            sub2={bestWorstDay ? `Best day: ${fmt(bestWorstDay.best)}` : undefined}
          />
        </div>
        <div className={avgPnlPct >= 0 ? 'rounded-xl shadow-[0_0_32px_rgba(0,230,118,0.07)]' : 'rounded-xl shadow-[0_0_32px_rgba(255,61,87,0.07)]'}>
          <MetricCard
            label="Avg P&L %"
            value={`${avgPnlPct >= 0 ? '+' : ''}${avgPnlPct.toFixed(2)}%`}
            variant={avgPnlPct >= 0 ? 'gain' : 'loss'}
            size="lg"
            sub="per trade"
            sub2={avgHold !== null ? `Avg ${Math.round(avgHold)}d hold` : undefined}
          />
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="flex items-center gap-3 mb-3 mt-5">
        <span className="text-[11px] font-bold text-text-primary tracking-[0.16em] uppercase border-l-2 border-accent pl-2.5 whitespace-nowrap">Risk & Benchmarks</span>
        <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Profit Factor"
          value={tradeResults.length === 0 ? '—' : profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
          variant={profitFactor >= 1.5 ? 'gain' : profitFactor < 1 ? 'loss' : 'default'}
          sub={tradeResults.length === 0 ? 'gross profit / loss' : `${fmt(expectancy)} expectancy`}
          sub2={kelly !== null ? `Kelly: ${(kelly * 100).toFixed(1)}%` : undefined}
        />
        <MetricCard
          label="Max Drawdown"
          value={tradeResults.length === 0 ? '—' : fmt(maxDrawdown)}
          variant={maxDrawdown < 0 ? 'loss' : 'default'}
          sub="peak to trough"
          sub2={bestWorstDay ? `Worst day: ${fmt(bestWorstDay.worst)}` : undefined}
        />
        <MetricCard
          label="SPY YTD"
          value={spyYtd !== null ? fmtPct(spyYtd) : '—'}
          variant={spyYtd === null ? 'default' : spyYtd >= 0 ? 'gain' : 'loss'}
          sub="benchmark"
        />
        <div className="relative bg-surface rounded-xl p-5 border border-default/50 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-border/80 via-border/20 to-transparent" />
          <div className="text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase mb-3">Avg Win / Loss</div>
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="text-2xl font-bold font-mono tracking-tight text-gain">
              {tradeResults.filter(t => t.pnl > 0).length === 0 ? '—' : fmt(avgGain)}
            </span>
            <span className="text-text-muted font-mono">/</span>
            <span className="text-2xl font-bold font-mono tracking-tight text-loss">
              {tradeResults.filter(t => t.pnl < 0).length === 0 ? '—' : fmt(avgLoss)}
            </span>
          </div>
          <div className="text-xs text-text-muted mt-2 leading-relaxed">
            {tradeResults.filter(t => t.pnl > 0).length}W · {tradeResults.filter(t => t.pnl < 0).length}L
          </div>
        </div>
      </div>

      {/* Latest Open Trades */}
      {openTrades.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold text-text-primary tracking-[0.16em] uppercase border-l-2 border-accent pl-2.5">Latest Open Trades</span>
          </div>
          <div className="border border-default rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-default bg-surface2">
                  <th className="px-4 py-2 text-left text-text-muted tracking-widest uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-text-muted tracking-widest uppercase">Ticker</th>
                  <th className="px-4 py-2 text-left text-text-muted tracking-widest uppercase">Strategy</th>
                  <th className="px-4 py-2 text-right text-text-muted tracking-widest uppercase">Entry</th>
                  <th className="px-4 py-2 text-right text-text-muted tracking-widest uppercase">DTE</th>
                  <th className="px-4 py-2 text-right text-text-muted tracking-widest uppercase">Mkt</th>
                  <th className="px-4 py-2 text-right text-text-muted tracking-widest uppercase">Unreal.</th>
                </tr>
              </thead>
              <tbody>
                {openTrades.map((trade, i) => (
                  <tr
                    key={trade.id}
                    className={`border-b border-default hover:bg-surface2 transition-colors ${i % 2 === 0 ? 'bg-surface' : 'bg-bg'}`}
                  >
                    <td className="px-4 py-2 text-text-secondary font-mono">{trade.date}</td>
                    <td className="px-4 py-2">
                      <Link href="/log" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <TickerLogo ticker={trade.ticker} size={18} />
                        <span className="text-text-primary font-bold tracking-wider">{trade.ticker}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-text-secondary">{STRATEGY_LABELS[trade.strategy] ?? trade.strategy}</td>
                    <td className="px-4 py-2 text-right text-text-primary font-mono">${trade.entry_price?.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-text-muted font-mono">
                      {trade.dte != null ? `${trade.dte}d` : '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-text-secondary font-mono">
                      {pricesLoading ? <span className="animate-pulse text-text-muted">…</span> : livePrices[trade.ticker] != null ? `$${livePrices[trade.ticker].toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {trade.asset_type !== 'option' && livePrices[trade.ticker] != null ? (() => {
                        const unrealized = (livePrices[trade.ticker] - trade.entry_price) * (trade.quantity ?? 1)
                        return <span className={unrealized >= 0 ? 'text-gain' : 'text-loss'}>{unrealized >= 0 ? '+$' : '-$'}{Math.abs(unrealized).toFixed(2)}</span>
                      })() : <span className="text-text-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex justify-end">
            <Link href="/log" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              View all in Trade Log →
            </Link>
          </div>
        </div>
      )}

      {/* Charts */}
      {trades.length === 0 ? (
        <div className="border border-default bg-surface p-12 text-center rounded-xl">
          <div className="text-text-primary text-base font-semibold mb-2">Welcome to your trading journal</div>
          <div className="text-text-muted text-sm mb-6 max-w-sm mx-auto">
            Track your trades, measure your edge, and spot what&apos;s working. Start by logging your first trade.
          </div>
          <Link
            href="/log"
            className="inline-block px-6 py-2.5 rounded-full border border-accent text-accent bg-accent/10 text-sm font-semibold hover:bg-accent/20 transition-colors"
          >
            Add your first trade →
          </Link>
        </div>
      ) : closedTrades.length === 0 ? (
        <div className="border border-default bg-surface p-12 text-center rounded-xl">
          <div className="text-text-muted text-sm">No closed trades in this date range.</div>
          <div className="text-text-muted text-xs mt-2">
            Add trades in the <a href="/log" className="text-accent hover:underline">Trade Log</a>.
          </div>
        </div>
      ) : (
        <>
          {/* Edge Score — full-width hero strip */}
          {edgeScore && (
            <div className="relative bg-surface rounded-xl border border-default/50 overflow-hidden p-5 mb-8">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_50%_100%_at_0%_50%,rgba(255,51,51,0.04),transparent)]" />
              <div className="relative flex items-center gap-6">
                {/* Radar */}
                <div className="flex-shrink-0">
                  <RadarChart width={180} height={180} data={edgeScore.axes} cx="50%" cy="50%" outerRadius="72%">
                    <defs>
                      <linearGradient id="radarSheen" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%"   stopColor="rgba(255,51,51,0.15)" />
                        <stop offset="42%"  stopColor="rgba(255,51,51,0.35)" />
                        <stop offset="50%"  stopColor="rgba(255,160,140,0.65)" />
                        <stop offset="58%"  stopColor="rgba(255,51,51,0.35)" />
                        <stop offset="100%" stopColor="rgba(255,51,51,0.15)" />
                        <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="5s" repeatCount="indefinite" />
                      </linearGradient>
                    </defs>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: '#8892a4', fontSize: 9, fontFamily: 'monospace' }} />
                    <Radar dataKey="value" stroke="#ff4444" fill="url(#radarSheen)" fillOpacity={1} dot={{ r: 3, fill: '#ff6666', strokeWidth: 0 }} />
                  </RadarChart>
                </div>
                {/* Center: score + rank + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-[10px] font-semibold text-text-muted tracking-[0.16em] uppercase">Your Edge Score</div>
                    <div className="relative group inline-flex">
                      <span className="text-text-muted/50 text-xs cursor-help select-none">ⓘ</span>
                      <div className="absolute left-0 bottom-full mb-2 w-64 text-[11px] text-text-secondary bg-surface2 border border-default rounded-lg px-3 py-2.5 shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none leading-relaxed whitespace-normal">
                        Composite score across 6 metrics: Win %, Profit Factor, Consistency, Max Drawdown, Avg Win/Loss, and Recovery Factor. Each is normalized to 0–100.
                      </div>
                    </div>
                  </div>
                  <div className="text-5xl font-bold font-mono text-text-primary leading-none mb-1">{edgeScore.composite.toFixed(1)}</div>
                  <div className="text-sm font-bold mb-4" style={{ color: getEdgeRank(edgeScore.composite).color }}>
                    {getEdgeRank(edgeScore.composite).label}
                  </div>
                  <div className="relative h-1.5 rounded-full overflow-hidden max-w-xs" style={{ background: 'linear-gradient(to right, #ff3d57 0%, #fbbf24 50%, #00e676 100%)' }}>
                    <div
                      className="absolute w-3 h-3 rounded-full bg-white shadow border-2 border-surface"
                      style={{ left: `${Math.min(Math.max(edgeScore.composite, 1.5), 98.5)}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-text-muted/60 mt-1.5 font-mono max-w-xs">
                    <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span>
                  </div>
                </div>
                {/* Right: 6-axis breakdown */}
                <div className="hidden md:grid grid-cols-3 gap-x-6 gap-y-3 flex-shrink-0 border-l border-default/40 pl-6">
                  {edgeScore.axes.map(a => (
                    <div key={a.axis} className="text-right">
                      <div className="text-[9px] text-text-muted uppercase tracking-widest mb-0.5">{a.axis}</div>
                      <div className="text-sm font-bold font-mono text-text-primary">{a.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-surface p-6 rounded-xl border border-default/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold text-text-primary tracking-[0.16em] uppercase border-l-2 border-accent pl-2.5">Cumulative P&L</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="pnlLineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={`${pnlGradientOffset}%`} stopColor={CHART_COLORS.gain} />
                    <stop offset={`${pnlGradientOffset}%`} stopColor={CHART_COLORS.loss} />
                  </linearGradient>
                  <linearGradient id="pnlFillGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={`${pnlGradientOffset}%`} stopColor={CHART_COLORS.gain} stopOpacity={0.15} />
                    <stop offset={`${pnlGradientOffset}%`} stopColor={CHART_COLORS.loss} stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_COLORS.surface} strokeDasharray="2 4" />
                <XAxis dataKey="date" tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(d: string) => {
                  const dt = new Date(d + 'T12:00:00')
                  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }} />
                <YAxis tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="pnl" stroke="url(#pnlLineGrad)" fill="url(#pnlFillGrad)" strokeWidth={2} dot={false} name="P&L" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-surface2/70 p-6 rounded-xl border border-default/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold text-text-primary tracking-[0.16em] uppercase border-l-2 border-accent pl-2.5">Monthly P&L</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid stroke={CHART_COLORS.surface} strokeDasharray="2 4" />
                <XAxis dataKey="month" tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" name="P&L" radius={[2,2,0,0]}>
                  {monthlyData.map((entry, index) => (
                    <Cell key={index} fill={entry.pnl >= 0 ? CHART_COLORS.gain : CHART_COLORS.loss} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-surface p-6 rounded-xl border border-default/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold text-text-primary tracking-[0.16em] uppercase border-l-2 border-accent pl-2.5">Win / Loss Split</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  <Cell fill={CHART_COLORS.gain} />
                  <Cell fill={CHART_COLORS.loss} />
                </Pie>
                <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="#dce4f2" fontSize={22} fontWeight={700} fontFamily="JetBrains Mono, monospace">
                  {(winRate * 100).toFixed(0)}%
                </text>
                <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fill="#8892a4" fontSize={9} fontFamily="JetBrains Mono, monospace" letterSpacing="2">
                  WIN RATE
                </text>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-6 justify-center mt-2">
              <span className="text-xs text-gain">● Wins: {pieData[0].value}</span>
              <span className="text-xs text-loss">● Losses: {pieData[1].value}</span>
            </div>
          </div>

          <div className="bg-surface2/70 p-6 rounded-xl border border-default/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold text-text-primary tracking-[0.16em] uppercase border-l-2 border-accent pl-2.5">P&L by Strategy</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={strategyData} layout="vertical">
                <CartesianGrid stroke={CHART_COLORS.surface} strokeDasharray="2 4" horizontal={false} />
                <XAxis type="number" tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="strategy" tick={{ fill: CHART_COLORS.muted, fontSize: 9 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" name="P&L" radius={[0,2,2,0]}>
                  {strategyData.map((entry, index) => (
                    <Cell key={index} fill={entry.pnl >= 0 ? CHART_COLORS.gain : CHART_COLORS.loss} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {tickerData.length > 0 && (
            <div className="bg-surface p-6 rounded-xl border border-default/50 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[11px] font-bold text-text-primary tracking-[0.16em] uppercase border-l-2 border-accent pl-2.5">P&L by Ticker</span>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(160, tickerData.length * 28)}>
                <BarChart data={tickerData} layout="vertical">
                  <CartesianGrid stroke={CHART_COLORS.surface} strokeDasharray="2 4" horizontal={false} />
                  <XAxis type="number" tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="ticker" tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} tickLine={false} axisLine={false} width={50} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pnl" name="P&L" radius={[0,2,2,0]}>
                    {tickerData.map((entry, index) => (
                      <Cell key={index} fill={entry.pnl >= 0 ? CHART_COLORS.gain : CHART_COLORS.loss} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Common Mistakes */}
          {mistakeData.length > 0 && (
            <div className="bg-surface2/70 p-6 rounded-xl border border-default/50 lg:col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-[11px] font-bold text-text-primary tracking-[0.16em] uppercase border-l-2 border-accent pl-2.5">Common Mistakes</span>
                <span className="text-[10px] text-text-muted font-mono ml-1">
                  {trades.filter(t => (t.mistake_tags ?? []).length > 0).length} tagged trade{trades.filter(t => (t.mistake_tags ?? []).length > 0).length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mistakeData.map(({ tag, count, pnl }) => {
                  const maxCount = mistakeData[0].count
                  const pct = (count / maxCount) * 100
                  const tagDef = MISTAKE_TAGS.find(t => t.value === tag)
                  const label = tagDef?.label ?? tag.replace(/_/g, ' ')
                  const cls = tagDef?.cls ?? 'text-amber bg-amber/10 border-amber/30'
                  return (
                    <div key={tag} className="flex flex-col gap-1.5 p-3 bg-surface2/50 rounded-lg border border-default/40">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>
                        <span className="text-xs font-mono text-text-muted">{count}×</span>
                      </div>
                      <div className="h-1 bg-surface2 rounded-full overflow-hidden">
                        <div className="h-full bg-amber/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      {pnl !== 0 && (
                        <div className={`text-[11px] font-mono text-right ${pnl < 0 ? 'text-loss' : 'text-gain'}`}>
                          {pnl < 0 ? '-' : '+'}${Math.abs(pnl).toFixed(2)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  )
}
