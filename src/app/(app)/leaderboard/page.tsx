'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import { STRATEGY_LABELS } from '@/types/database'
import { PageHeader } from '@/components/ui/PageHeader'
import { calcMaxDrawdown, calcProfitFactor, calcAvgGain, calcAvgLoss } from '@/utils/calculations'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const LINE_COLORS = ['#00e676','#f59e0b','#60a5fa','#f472b6','#a78bfa','#34d399','#fb923c','#e879f9']

type SortKey = 'username' | 'ticker' | 'strategy' | 'date' | 'pnl'
type SortDir = 'asc' | 'desc'

interface PublicTrade {
  id: string
  user_id: string
  date: string
  ticker: string
  strategy: string
  pnl: number | null
}

interface TradeWithUser extends PublicTrade {
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

function computeEdgeScore(closedTrades: PublicTrade[]): number | null {
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
  const [activeTab, setActiveTab] = useState<'rankings' | 'chart'>('rankings')
  const [profileMap, setProfileMap] = useState<Record<string, { user_id: string; show_on_leaderboard: boolean }>>({})
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: profiles, error: pErr }, { data: tradesData, error: tErr }] = await Promise.all([
        supabase.from('profiles').select('user_id, username, show_on_leaderboard' as any),
        supabase.from('leaderboard_trades' as any).select('id, user_id, date, ticker, strategy, pnl').order('date', { ascending: false }).limit(1000),
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

      setProfileMap(
        Object.fromEntries(
          (profiles ?? []).map((p: { user_id: string; username: string; show_on_leaderboard?: boolean }) => [
            p.username,
            { user_id: p.user_id, show_on_leaderboard: p.show_on_leaderboard ?? false },
          ])
        )
      )

      setTrades(
        (tradesData ?? [])
          .map(t => ({ ...t, username: userMap[t.user_id] ?? 'unknown' }))
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

  const cumulativeChartData = useMemo(() => {
    const userDayMap: Record<string, Record<string, number>> = {}
    for (const t of trades) {
      if (t.pnl == null) continue
      if (!userDayMap[t.username]) userDayMap[t.username] = {}
      userDayMap[t.username][t.date] = (userDayMap[t.username][t.date] ?? 0) + t.pnl
    }
    const userLines: Record<string, { date: string; value: number }[]> = {}
    for (const [username, dayMap] of Object.entries(userDayMap)) {
      const dates = Object.keys(dayMap).sort()
      let cum = 0
      userLines[username] = dates.map(date => { cum += dayMap[date]; return { date, value: cum } })
    }
    const allDates = [...new Set(Object.values(userLines).flatMap(pts => pts.map(p => p.date)))].sort()
    return allDates.map(date => {
      const point: Record<string, string | number> = { date }
      for (const [username, pts] of Object.entries(userLines)) {
        const last = pts.filter(p => p.date <= date).at(-1)
        if (last) point[username] = parseFloat(last.value.toFixed(2))
      }
      return point
    })
  }, [trades])

  const chartUsernames = useMemo(
    () => userStats.filter(u => u.closedTrades > 0).map(u => u.username),
    [userStats]
  )

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

      {/* Tab bar */}
      <div className="flex gap-0 mb-6 border-b border-default/40">
        {(['rankings', 'chart'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold tracking-[0.1em] uppercase transition-colors border-b-2 -mb-px ${
              activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}>
            {tab === 'rankings' ? 'Rankings' : 'P&L Chart'}
          </button>
        ))}
      </div>

      {/* Podium — top 3 */}
      {activeTab === 'rankings' && userStats.length > 0 && (
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
              <div className="font-semibold text-sm text-text-primary mb-1">
                <button
                  onClick={() => setSelectedUsername(u.username)}
                  className="hover:underline hover:text-text-primary transition-colors cursor-pointer"
                >
                  @{u.username}
                </button>
              </div>
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
      {activeTab === 'rankings' && userStats.length > 3 && (
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
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Edge Score</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Total P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default/20">
              {userStats.map((u, i) => (
                <tr key={u.username} className="hover:bg-surface2/40 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-text-muted">#{i + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-text-primary">
                    <button
                      onClick={() => setSelectedUsername(u.username)}
                      className="hover:underline hover:text-text-primary transition-colors cursor-pointer"
                    >
                      @{u.username}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-muted">{u.trades}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-muted">
                    {u.closedTrades > 0 ? `${Math.round(u.wins / u.closedTrades * 100)}%` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-muted">
                    {u.edgeScore !== null ? (
                      <span style={{ color: getEdgeRank(u.edgeScore).color }}>{u.edgeScore.toFixed(1)}</span>
                    ) : '—'}
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

      {/* Filters + Trades table */}
      {activeTab === 'rankings' && (
      <>
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
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                  <button
                    onClick={() => setSelectedUsername(t.username)}
                    className="hover:underline hover:text-text-primary transition-colors cursor-pointer"
                  >
                    @{t.username}
                  </button>
                </td>
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
      </>
      )}

      {/* P/L Chart */}
      {activeTab === 'chart' && (
        <div className="rounded-xl border border-default/50 bg-surface p-4">
          <div className="text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase mb-4">
            Cumulative P&amp;L — All Traders
          </div>
          {cumulativeChartData.length < 2 ? (
            <div className="text-center text-text-muted text-xs py-16">Not enough closed trades to display</div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={cumulativeChartData} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }}
                  tickFormatter={(d: string) => {
                    const [, m, day] = d.split('-')
                    return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]} ${parseInt(day)}`
                  }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#888' }}
                  tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `$${(v/1000).toFixed(1)}K` : `$${v}`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                  formatter={(value: number, name: string) => [
                    (value >= 0 ? '+$' : '-$') + Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                    `@${name}`
                  ]}
                  labelFormatter={(d: string) => d}
                />
                <Legend formatter={(v: string) => `@${v}`} wrapperStyle={{ fontSize: 11 }} />
                {chartUsernames.map((username, i) => (
                  <Line key={username} type="monotone" dataKey={username}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2} dot={false} connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Profile panel backdrop */}
      {selectedUsername && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedUsername(null)}
          />
          <div className="fixed inset-y-0 right-0 w-96 bg-surface border-l border-default z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-default">
              <span className="font-display font-semibold text-text-primary">@{selectedUsername}</span>
              <button
                onClick={() => setSelectedUsername(null)}
                className="text-text-muted hover:text-text-primary text-xl leading-none"
                aria-label="Close"
              >×</button>
            </div>

            {/* Stats row */}
            {(() => {
              const stats = userStats.find(u => u.username === selectedUsername)
              const isPublic = profileMap[selectedUsername]?.show_on_leaderboard ?? false
              const userTrades = trades.filter(t => t.username === selectedUsername && t.pnl != null)
              if (!stats) return null
              return (
                <div className="flex-1 overflow-y-auto">
                  {/* Stat chips */}
                  <div className="grid grid-cols-2 gap-3 px-6 py-4 border-b border-default">
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">Total P&L</div>
                      <div className={`font-mono text-sm font-semibold ${stats.pnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {stats.pnl >= 0 ? '+' : ''}{stats.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">Win Rate</div>
                      <div className="font-mono text-sm font-semibold text-text-primary">
                        {stats.closedTrades > 0 ? `${(stats.wins / stats.closedTrades * 100).toFixed(1)}%` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">Closed Trades</div>
                      <div className="font-mono text-sm font-semibold text-text-primary">{stats.closedTrades}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">Edge Score</div>
                      <div className="font-mono text-sm font-semibold text-text-primary">
                        {stats.edgeScore != null ? stats.edgeScore.toFixed(1) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Trade list or private message */}
                  {isPublic ? (
                    <div className="px-6 py-4">
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-3">Trade Log</div>
                      {userTrades.length === 0 ? (
                        <p className="text-xs text-text-muted">No closed trades.</p>
                      ) : (
                        <div className="space-y-1">
                          {userTrades.map(t => (
                            <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-default/40 last:border-0">
                              <div>
                                <span className="font-mono text-xs font-bold text-text-primary">{t.ticker}</span>
                                <span className="font-mono text-[10px] text-text-muted ml-2">{t.date}</span>
                              </div>
                              <span className={`font-mono text-xs font-semibold ${(t.pnl ?? 0) >= 0 ? 'text-gain' : 'text-loss'}`}>
                                {(t.pnl ?? 0) >= 0 ? '+' : ''}{(t.pnl ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <div className="text-text-muted text-sm">🔒</div>
                      <p className="text-sm text-text-muted mt-2">This trader keeps their trades private.</p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
