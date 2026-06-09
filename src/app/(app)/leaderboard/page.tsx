'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trade, Profile } from '@/types/database'
import { STRATEGY_LABELS } from '@/types/database'
import { PageHeader } from '@/components/ui/PageHeader'
import { calcMaxDrawdown, calcProfitFactor, calcAvgGain, calcAvgLoss } from '@/utils/calculations'

type SortKey = 'username' | 'ticker' | 'strategy' | 'date' | 'pnl'
type SortDir = 'asc' | 'desc'

interface TradeWithUser extends Trade {
  username: string
}

interface UserStat {
  username: string
  trades: number
  closedTrades: number
  pnl: number
  wins: number
  edgeScore: number | null
}

function computeEdgeScore(closedTrades: Trade[]): number | null {
  if (closedTrades.length < 3) return null
  const results = closedTrades.map(t => ({ pnl: t.pnl ?? 0 }))
  const wins = results.filter(r => r.pnl > 0).length
  const winScore = (wins / closedTrades.length) * 100
  const pf = calcProfitFactor(results)
  const pfScore = (Math.min(pf === Infinity ? 3 : pf, 3) / 3) * 100
  const monthlyMap: Record<string, number> = {}
  closedTrades.forEach(t => { const m = t.date.slice(0, 7); monthlyMap[m] = (monthlyMap[m] ?? 0) + (t.pnl ?? 0) })
  const months = Object.values(monthlyMap)
  const consistencyScore = (months.filter(p => p >= 0).length / months.length) * 100
  const grossProfit = results.filter(r => r.pnl > 0).reduce((s, r) => s + r.pnl, 0)
  const md = calcMaxDrawdown(results)
  const drawdownScore = grossProfit > 0 ? Math.max(0, 100 - (Math.abs(md) / grossProfit) * 100) : md === 0 ? 100 : 0
  const avgG = calcAvgGain(results)
  const avgL = calcAvgLoss(results)
  const hasW = results.some(r => r.pnl > 0)
  const hasL = results.some(r => r.pnl < 0)
  const ratio = hasW && hasL ? avgG / Math.abs(avgL) : hasW ? 3 : 0
  const winLossScore = Math.min((ratio / 3) * 100, 100)
  const totalPnl = results.reduce((s, r) => s + r.pnl, 0)
  const rf = md !== 0 ? totalPnl / Math.abs(md) : totalPnl > 0 ? 5 : 0
  const recoveryScore = Math.min(Math.max((rf / 5) * 100, 0), 100)
  return (winScore + pfScore + consistencyScore + drawdownScore + winLossScore + recoveryScore) / 6
}

function fmtPnl(n: number) {
  return (n >= 0 ? '+$' : '-$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function getEdgeRank(score: number): { label: string; color: string } {
  if (score < 20) return { label: 'Gambler',     color: '#ff3d57' }
  if (score < 40) return { label: 'Speculator',  color: '#f59e0b' }
  if (score < 60) return { label: 'Trader',      color: '#fbbf24' }
  if (score < 80) return { label: 'Tactician',   color: '#4ade80' }
  return               { label: 'Market Maker', color: '#00e676' }
}

export default function LeaderboardPage() {
  const [trades, setTrades] = useState<TradeWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterUser, setFilterUser] = useState('all')
  const [filterTicker, setFilterTicker] = useState('all')
  const [filterStrategy, setFilterStrategy] = useState('all')

  useEffect(() => {
    async function load() {
      const [{ data: profiles, error: pErr }, { data: tradesData, error: tErr }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('trades').select('*').order('date', { ascending: false }),
      ])

      if (pErr || tErr) {
        setError(
          tErr?.code === '42501'
            ? 'Leaderboard requires an RLS policy update — run the SQL in the setup instructions.'
            : 'Could not load leaderboard data.'
        )
        setLoading(false)
        return
      }

      const userMap: Record<string, string> = {}
      for (const p of (profiles ?? []) as Profile[]) {
        userMap[p.user_id] = p.username
      }

      setTrades(
        (tradesData ?? []).map(t => ({ ...t, username: userMap[t.user_id] ?? 'unknown' }))
      )
      setLoading(false)
    }
    load()
  }, [])

  const userStats = useMemo((): UserStat[] => {
    const map: Record<string, { username: string; trades: number; closedTrades: number; pnl: number; wins: number; closedList: TradeWithUser[] }> = {}
    for (const t of trades) {
      if (!map[t.username]) map[t.username] = { username: t.username, trades: 0, closedTrades: 0, pnl: 0, wins: 0, closedList: [] }
      map[t.username].trades++
      if (t.pnl != null) {
        map[t.username].closedTrades++
        map[t.username].pnl += t.pnl
        if (t.pnl > 0) map[t.username].wins++
        map[t.username].closedList.push(t)
      }
    }
    return Object.values(map)
      .map(({ closedList, ...stat }) => ({ ...stat, edgeScore: computeEdgeScore(closedList) }))
      .sort((a, b) => b.pnl - a.pnl)
  }, [trades])

  const userOptions = useMemo(() => Array.from(new Set(trades.map(t => t.username))).sort(), [trades])
  const tickerOptions = useMemo(() => Array.from(new Set(trades.map(t => t.ticker))).sort(), [trades])
  const strategyOptions = useMemo(() => Array.from(new Set(trades.map(t => t.strategy))).sort(), [trades])

  const filtered = useMemo(() => {
    let data = [...trades]
    if (filterUser !== 'all') data = data.filter(t => t.username === filterUser)
    if (filterTicker !== 'all') data = data.filter(t => t.ticker === filterTicker)
    if (filterStrategy !== 'all') data = data.filter(t => t.strategy === filterStrategy)
    data.sort((a, b) => {
      let aVal: string | number
      let bVal: string | number
      switch (sortKey) {
        case 'username': aVal = a.username; bVal = b.username; break
        case 'ticker':   aVal = a.ticker;   bVal = b.ticker;   break
        case 'strategy': aVal = a.strategy; bVal = b.strategy; break
        case 'date':     aVal = a.date;     bVal = b.date;     break
        case 'pnl':      aVal = a.pnl ?? -Infinity; bVal = b.pnl ?? -Infinity; break
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [trades, filterUser, filterTicker, filterStrategy, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className={`ml-1 text-[10px] ${sortKey === col ? 'text-accent' : 'text-text-muted/40'}`}>
      {sortKey === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  )

  const medalColor = ['text-yellow-400', 'text-slate-300', 'text-amber-600']
  const topLinePodium = [
    'from-yellow-400/40 via-yellow-400/8 to-transparent',
    'from-slate-400/30 via-slate-400/5 to-transparent',
    'from-amber-600/30 via-amber-600/5 to-transparent',
  ]

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
      <div className="text-text-muted text-sm animate-pulse">Loading leaderboard…</div>
    </div>
  )

  if (error) return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Leaderboard" />
      <div className="bg-loss/10 border border-loss/20 rounded-xl p-5 text-sm">
        <p className="text-loss font-semibold mb-2">Setup required</p>
        <p className="text-text-muted mb-4">{error}</p>
        <p className="text-text-muted text-xs mb-2 font-mono">Run this in your Supabase SQL editor:</p>
        <pre className="bg-bg rounded-lg p-3 text-xs text-text-secondary font-mono overflow-x-auto">{`CREATE POLICY "leaderboard_read_trades"
ON trades FOR SELECT TO authenticated
USING (true);`}</pre>
      </div>
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Leaderboard"
        subtitle={`${trades.length} trades · ${userStats.length} trader${userStats.length !== 1 ? 's' : ''}`}
      />

      {/* Podium — top 3 */}
      {userStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {userStats.slice(0, 3).map((u, i) => (
            <div key={u.username} className="relative rounded-xl border border-default/50 bg-surface overflow-hidden p-4">
              <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${topLinePodium[i]}`} />
              <div className="flex items-center justify-between mb-2">
                <span className={`font-mono text-sm font-bold ${medalColor[i]}`}>#{i + 1}</span>
                <span className="text-[10px] text-text-muted font-mono">
                  {u.closedTrades > 0 ? Math.round(u.wins / u.closedTrades * 100) : 0}% win rate
                </span>
              </div>
              <div className="font-semibold text-sm text-text-primary mb-1">@{u.username}</div>
              <div className={`font-mono font-bold text-xl ${u.pnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                {fmtPnl(u.pnl)}
              </div>
              <div className="text-[10px] text-text-muted mt-1">{u.trades} trades logged</div>
              {u.edgeScore !== null && (
                <div className="mt-2.5 pt-2.5 border-t border-default/30 flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">Edge Score</span>
                  <div className="flex items-center gap-2">
                    <div className="relative w-16 h-1 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #ff3d57 0%, #fbbf24 50%, #00e676 100%)' }}>
                      <div className="absolute w-2 h-2 rounded-full bg-white shadow border border-surface/80"
                        style={{ left: `${Math.min(Math.max(u.edgeScore, 2), 98)}%`, top: '50%', transform: 'translate(-50%, -50%)' }} />
                    </div>
                    <span className="font-mono text-xs font-bold text-text-primary">{u.edgeScore.toFixed(1)}</span>
                    <span className="text-[10px] font-semibold" style={{ color: getEdgeRank(u.edgeScore).color }}>
                      {getEdgeRank(u.edgeScore).label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full rankings table (if > 3 users) */}
      {userStats.length > 3 && (
        <div className="mb-8 rounded-xl border border-default/50 overflow-hidden bg-surface">
          <div className="px-4 py-2.5 border-b border-default/40 bg-surface2/50">
            <span className="text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">All Rankings</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-default/30">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase w-12">Rank</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">User</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Trades</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Win %</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Total P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default/20">
              {userStats.map((u, i) => (
                <tr key={u.username} className="hover:bg-surface2/40 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-text-muted">#{i + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-text-primary">@{u.username}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-muted">{u.trades}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-muted">
                    {u.closedTrades > 0 ? `${Math.round(u.wins / u.closedTrades * 100)}%` : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono font-bold ${u.pnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {fmtPnl(u.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className="bg-surface border border-default text-xs text-text-secondary px-3 py-2 rounded-lg focus:outline-none focus:border-accent transition-colors"
        >
          <option value="all">All Users</option>
          {userOptions.map(u => <option key={u} value={u}>@{u}</option>)}
        </select>
        <select
          value={filterTicker}
          onChange={e => setFilterTicker(e.target.value)}
          className="bg-surface border border-default text-xs text-text-secondary px-3 py-2 rounded-lg focus:outline-none focus:border-accent transition-colors"
        >
          <option value="all">All Stocks</option>
          {tickerOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterStrategy}
          onChange={e => setFilterStrategy(e.target.value)}
          className="bg-surface border border-default text-xs text-text-secondary px-3 py-2 rounded-lg focus:outline-none focus:border-accent transition-colors"
        >
          <option value="all">All Trade Types</option>
          {strategyOptions.map(s => <option key={s} value={s}>{STRATEGY_LABELS[s] ?? s}</option>)}
        </select>
        <span className="ml-auto text-xs text-text-muted self-center font-mono">{filtered.length} trades</span>
      </div>

      {/* Trades table */}
      <div className="rounded-xl border border-default/50 overflow-hidden bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-default/50 bg-surface2/50">
              {(
                [
                  { key: 'username' as SortKey, label: 'User', align: 'left' },
                  { key: 'ticker' as SortKey, label: 'Stock', align: 'left' },
                  { key: 'strategy' as SortKey, label: 'Type', align: 'left' },
                  { key: 'date' as SortKey, label: 'Date', align: 'left' },
                  { key: 'pnl' as SortKey, label: 'P&L', align: 'right' },
                ] as { key: SortKey; label: string; align: string }[]
              ).map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-4 py-3 text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase cursor-pointer hover:text-text-primary select-none text-${col.align}`}
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-default/30">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-muted text-xs">No trades match the current filters</td>
              </tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="hover:bg-surface2/40 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">@{t.username}</td>
                <td className="px-4 py-3 font-mono font-bold text-text-primary text-xs">{t.ticker}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[10px] text-text-muted border border-default/40 rounded px-1.5 py-0.5 uppercase tracking-wide">
                    {STRATEGY_LABELS[t.strategy] ?? t.strategy}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-text-muted">{t.date}</td>
                <td className={`px-4 py-3 font-mono text-xs font-semibold text-right ${(t.pnl ?? 0) >= 0 ? 'text-gain' : t.pnl != null ? 'text-loss' : 'text-text-muted'}`}>
                  {t.pnl != null ? fmtPnl(t.pnl) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
