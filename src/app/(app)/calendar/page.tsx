'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Trade } from '@/types/database'
import { STRATEGY_LABELS } from '@/types/database'
import { PageHeader } from '@/components/ui/PageHeader'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmtPnl(n: number) {
  return (n >= 0 ? '+$' : '-$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function CalendarPage() {
  const { user } = useAuth()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [filterTicker, setFilterTicker] = useState('')
  const [filterStrategy, setFilterStrategy] = useState('')

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setTrades(data ?? [])
        setLoading(false)
      })
  }, [user])

  const filteredTrades = useMemo(() => trades.filter(t =>
    (!filterTicker || t.ticker.includes(filterTicker.toUpperCase())) &&
    (!filterStrategy || t.strategy === filterStrategy)
  ), [trades, filterTicker, filterStrategy])

  const tradesByDate = useMemo(() => {
    const map: Record<string, Trade[]> = {}
    for (const t of filteredTrades) {
      if (!map[t.date]) map[t.date] = []
      map[t.date].push(t)
    }
    return map
  }, [filteredTrades])

  const pnlByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const [date, dayTrades] of Object.entries(tradesByDate)) {
      map[date] = dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
    }
    return map
  }, [tradesByDate])

  const winRateByDate = useMemo(() => {
    const map: Record<string, number | null> = {}
    for (const [date, dayTrades] of Object.entries(tradesByDate)) {
      const closed = dayTrades.filter(t => t.pnl != null)
      map[date] = closed.length === 0 ? null : (closed.filter(t => (t.pnl ?? 0) > 0).length / closed.length) * 100
    }
    return map
  }, [tradesByDate])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = currentMonth.getDay()
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7

  const monthlyPnl = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
    return Object.entries(pnlByDate)
      .filter(([date]) => date.startsWith(prefix))
      .reduce((sum, [, pnl]) => sum + pnl, 0)
  }, [pnlByDate, year, month])

  const monthlyTradeCount = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
    return Object.entries(tradesByDate)
      .filter(([date]) => date.startsWith(prefix))
      .reduce((sum, [, ts]) => sum + ts.length, 0)
  }, [tradesByDate, year, month])

  const strategyOptions = useMemo(() => {
    const seen = new Set<string>()
    trades.forEach(t => seen.add(t.strategy))
    return Array.from(seen).sort()
  }, [trades])

  const today = new Date().toISOString().slice(0, 10)
  const selectedTrades = selectedDate ? (tradesByDate[selectedDate] ?? []) : []
  const isFiltered = !!filterTicker || !!filterStrategy

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        <div className="text-text-muted text-sm animate-pulse">Loading…</div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Calendar"
        subtitle="Daily P&L view"
      />

      {/* Month nav + summary */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface border border-default text-text-secondary hover:text-text-primary hover:border-default/80 transition-colors text-lg"
          >
            ‹
          </button>
          <span className="font-mono text-sm font-semibold text-text-primary min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface border border-default text-text-secondary hover:text-text-primary hover:border-default/80 transition-colors text-lg"
          >
            ›
          </button>
        </div>

        {monthlyTradeCount > 0 && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-text-muted">{monthlyTradeCount} trade{monthlyTradeCount !== 1 ? 's' : ''}</span>
            <span className={`font-mono font-bold ${monthlyPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
              {fmtPnl(monthlyPnl)} month
            </span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input
          type="text"
          value={filterTicker}
          onChange={e => setFilterTicker(e.target.value.toUpperCase())}
          placeholder="Filter by ticker…"
          className="bg-surface border border-default rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors w-36 font-mono"
        />
        <select
          value={filterStrategy}
          onChange={e => setFilterStrategy(e.target.value)}
          className="bg-surface border border-default rounded-lg px-3 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent transition-colors"
        >
          <option value="">All strategies</option>
          {strategyOptions.map(s => (
            <option key={s} value={s}>{STRATEGY_LABELS[s] ?? s}</option>
          ))}
        </select>
        {isFiltered && (
          <button
            onClick={() => { setFilterTicker(''); setFilterStrategy('') }}
            className="text-xs text-text-muted hover:text-accent transition-colors"
          >
            Clear filters
          </button>
        )}
        {isFiltered && (
          <span className="text-xs text-text-muted font-mono">
            {filteredTrades.length} / {trades.length} trades shown
          </span>
        )}
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-default/50 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[repeat(7,1fr)_84px] bg-surface2/60 border-b border-default/40">
          {DAYS.map(d => (
            <div key={d} className="py-2.5 text-center text-[10px] font-semibold text-text-muted tracking-[0.15em] uppercase">
              {d}
            </div>
          ))}
          <div className="py-2.5 text-center text-[10px] font-semibold text-text-muted tracking-[0.15em] uppercase">Week</div>
        </div>

        {/* Week rows */}
        <div className="bg-surface">
          {Array.from({ length: totalCells / 7 }).map((_, wi) => {
            const weekDays = Array.from({ length: 7 }, (_, di) => {
              const i = wi * 7 + di
              const dayNum = i - firstDayOfWeek + 1
              const isInMonth = dayNum >= 1 && dayNum <= daysInMonth
              const dateStr = isInMonth
                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                : null
              const dayTrades = dateStr ? (tradesByDate[dateStr] ?? []) : []
              const pnl = dateStr ? (pnlByDate[dateStr] ?? 0) : 0
              const winRate = dateStr ? (winRateByDate[dateStr] ?? null) : null
              return { i, di, dayNum, isInMonth, dateStr, dayTrades, pnl, winRate }
            })

            const weekPnl = weekDays.reduce((sum, d) => d.isInMonth && d.dayTrades.length > 0 ? sum + d.pnl : sum, 0)
            const hasWeekActivity = weekDays.some(d => d.isInMonth && d.dayTrades.length > 0)

            return (
              <div key={wi} className="grid grid-cols-[repeat(7,1fr)_84px]">
                {weekDays.map(({ i, di, dayNum, isInMonth, dateStr, dayTrades, pnl, winRate }) => {
                  const hasActivity = dayTrades.length > 0
                  const isSelected = dateStr === selectedDate
                  const isToday = dateStr === today
                  const isWeekend = di === 0 || di === 6
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (!isInMonth || !dateStr) return
                        setSelectedDate(isSelected ? null : dateStr)
                      }}
                      className={[
                        'min-h-[88px] p-2 border-b border-r relative transition-colors',
                        hasActivity && !isSelected && pnl > 0 ? 'border-gain/30 bg-gain/10' :
                        hasActivity && !isSelected && pnl < 0 ? 'border-loss/30 bg-loss/10' :
                        'border-default/20',
                        !isInMonth ? 'bg-bg' : '',
                        isWeekend && isInMonth && !hasActivity && !isSelected ? 'bg-surface2/40' : '',
                        isSelected ? 'bg-accent/8 ring-1 ring-inset ring-accent/30 border-accent/20' : '',
                        isInMonth ? 'cursor-pointer' : '',
                        hasActivity && !isSelected && pnl > 0 ? 'hover:bg-gain/15' : '',
                        hasActivity && !isSelected && pnl < 0 ? 'hover:bg-loss/15' : '',
                        !hasActivity && isInMonth && !isSelected ? 'hover:bg-surface/40' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {isInMonth && (
                        <>
                          <div className={[
                            'text-sm font-mono font-semibold mb-1.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto',
                            isToday ? 'bg-accent text-bg' : 'text-text-muted',
                          ].join(' ')}>
                            {dayNum}
                          </div>
                          {hasActivity && (
                            <>
                              <div className={`text-xs font-mono font-bold leading-tight text-center ${pnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                                {fmtPnl(pnl)}
                              </div>
                              <div className="text-[11px] text-text-muted mt-0.5 text-center">
                                {dayTrades.length}t
                                {winRate != null ? ` · ${Math.round(winRate)}%W` : ''}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Weekly total */}
                <div className="min-h-[88px] border-b border-l border-default/40 bg-surface/50 flex flex-col items-center justify-center p-2 gap-0.5">
                  {hasWeekActivity ? (
                    <>
                      <div className="text-[10px] text-text-muted uppercase tracking-widest font-semibold">Week</div>
                      <div className={`font-mono text-xs font-bold ${weekPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {fmtPnl(weekPnl)}
                      </div>
                    </>
                  ) : (
                    <span className="text-text-muted/20 text-xs">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day breakdown */}
      {selectedDate && (
        <div className="mt-5 rounded-xl border border-default/50 bg-surface overflow-hidden">
          <div className="px-5 py-3.5 border-b border-default/40 flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </span>
            <span className={`font-mono text-sm font-bold ${(pnlByDate[selectedDate] ?? 0) >= 0 ? 'text-gain' : 'text-loss'}`}>
              {fmtPnl(pnlByDate[selectedDate] ?? 0)}
            </span>
          </div>
          {selectedTrades.length === 0 ? (
            <div className="px-5 py-6 text-center text-xs text-text-muted">No trades match the current filters for this day.</div>
          ) : (
            <div className="divide-y divide-default/30">
              {selectedTrades.map(t => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-text-primary">{t.ticker}</span>
                    <span className="font-mono text-[10px] text-text-muted border border-default/40 rounded px-1.5 py-0.5 uppercase tracking-wide">
                      {STRATEGY_LABELS[t.strategy] ?? t.strategy}
                    </span>
                    {t.strike && (
                      <span className="text-xs text-text-muted">${t.strike} strike</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-text-muted font-mono">
                      {t.quantity}× @${t.entry_price}
                      {t.exit_price ? ` → $${t.exit_price}` : ''}
                    </span>
                    <span className={`font-mono font-semibold min-w-[60px] text-right ${(t.pnl ?? 0) >= 0 ? 'text-gain' : t.pnl != null ? 'text-loss' : 'text-text-muted'}`}>
                      {t.pnl != null ? fmtPnl(t.pnl) : 'Open'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
