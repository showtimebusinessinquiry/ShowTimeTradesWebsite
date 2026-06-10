'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Trade, PortfolioPosition, WheelCycle, InsertTrade } from '@/types/database'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcDTE(expiration: string | null): number | null {
  if (!expiration) return null
  // Options expire at 4:00 PM ET; 21:00 UTC approximates 4 PM EST to avoid showing 0 DTE all day
  const expiryMs = new Date(`${expiration}T21:00:00Z`).getTime()
  const diff = expiryMs - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

function dteColor(dte: number): string {
  if (dte > 21) return 'text-gain'
  if (dte > 7) return 'text-amber'
  return 'text-loss'
}

function fmt(n: number): string {
  return `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(2)}`
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'new_cycle' }
  | { type: 'mark_assigned'; cycleId: string; trade: Trade }
  | { type: 'btc'; cycleId: string; trade: Trade }
  | { type: 'add_cc'; cycleId: string; cycle: WheelCycle; contracts: number }
  | { type: 'call_away'; cycleId: string; trade: Trade; cycle: WheelCycle }
  | { type: 'abandon'; cycleId: string }

interface FormValues {
  date: string
  ticker: string
  strike: string
  expiration: string
  contracts: string
  premium: string
  delta: string
  btc_price: string
  shares: string
  cost_basis: string
  exit_price: string
  notes: string
}

const defaultForm = (): FormValues => ({
  date: new Date().toISOString().slice(0, 10),
  ticker: '',
  strike: '',
  expiration: '',
  contracts: '1',
  premium: '',
  delta: '',
  btc_price: '',
  shares: '',
  cost_basis: '',
  exit_price: '',
  notes: '',
})

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WheelPage() {
  const { user } = useAuth()
  const [cycles, setCycles] = useState<WheelCycle[]>([])
  const [wheelTrades, setWheelTrades] = useState<Trade[]>([])
  const [wheelPositions, setWheelPositions] = useState<PortfolioPosition[]>([])
  const [allPositions, setAllPositions] = useState<PortfolioPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [form, setForm] = useState<FormValues>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [tab, setTab] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE')

  // Live market data
  type QuoteData = { price: number; change: number; changePct: number }
  type OptionMarkData = { mark: number | null; bid: number | null; ask: number | null; iv: number | null; inTheMoney: boolean | null }
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({})
  const [optionMarks, setOptionMarks] = useState<Record<string, OptionMarkData>>({})
  const [liveLoading, setLiveLoading] = useState(false)

  const fetchAll = async () => {
    if (!user) return
    const [cyclesRes, tradesRes, positionsRes] = await Promise.all([
      supabase
        .from('wheel_cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false }),
      supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .not('cycle_id', 'is', null)
        .order('date', { ascending: true }),
      supabase
        .from('portfolio_positions')
        .select('*')
        .eq('user_id', user.id),
    ])
    setCycles((cyclesRes.data ?? []) as WheelCycle[])
    setWheelTrades((tradesRes.data ?? []) as Trade[])
    const allPos = (positionsRes.data ?? []) as PortfolioPosition[]
    setAllPositions(allPos)
    setWheelPositions(allPos.filter(p => p.cycle_id != null))
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchAll()
    else setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── Modal helpers ────────────────────────────────────────────────────────────

  const openModal = (m: ModalState) => {
    const f = defaultForm()
    if (m.type === 'mark_assigned') {
      f.shares = String(m.trade.quantity * 100)
      f.cost_basis = m.trade.strike?.toFixed(2) ?? ''
    } else if (m.type === 'add_cc') {
      f.contracts = String(m.contracts)
    } else if (m.type === 'call_away') {
      f.exit_price = m.trade.strike?.toFixed(2) ?? ''
    }
    setForm(f)
    setFormError(null)
    setModal(m)
  }

  const closeModal = () => {
    setModal(null)
    setFormError(null)
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleMarkExpired = async (trade: Trade) => {
    const pnl = parseFloat((trade.entry_price * trade.quantity * 100).toFixed(2))
    const { error } = await supabase
      .from('trades')
      .update({ exit_price: 0, pnl, pnl_pct: 100, updated_at: new Date().toISOString() })
      .eq('id', trade.id)
    if (error) alert(error.message)
    else await fetchAll()
  }

  const handleMarkAssigned = async () => {
    if (!modal || modal.type !== 'mark_assigned') return
    if (!user) { setFormError('Session expired. Please sign in again.'); return }
    setSaving(true)
    const { trade, cycleId } = modal
    const pnl = parseFloat((trade.entry_price * trade.quantity * 100).toFixed(2))
    const shares = parseFloat(form.shares) || trade.quantity * 100
    const costBasis = parseFloat(form.cost_basis) || (trade.strike ?? 0)

    const [tradeRes, cycleRes, posRes] = await Promise.all([
      supabase.from('trades').update({
        exit_price: 0, pnl, pnl_pct: 100, updated_at: new Date().toISOString(),
      }).eq('id', trade.id),
      supabase.from('wheel_cycles').update({
        shares_quantity: shares,
        shares_cost_basis: costBasis,
        updated_at: new Date().toISOString(),
      }).eq('id', cycleId),
      supabase.from('portfolio_positions').insert({
        user_id: user.id,
        ticker: trade.ticker,
        asset_type: 'equity',
        entry_price: costBasis,
        quantity: shares,
        notes: `Wheel assignment from ${trade.date}`,
        cycle_id: cycleId,
      }),
    ])

    if (tradeRes.error) { setFormError(tradeRes.error.message); setSaving(false); return }
    if (cycleRes.error) { setFormError(cycleRes.error.message); setSaving(false); return }
    if (posRes.error) { setFormError(posRes.error.message); setSaving(false); return }

    setSaving(false)
    closeModal()
    await fetchAll()
  }

  const handleBTC = async () => {
    if (!modal || modal.type !== 'btc') return
    const btcPrice = parseFloat(form.btc_price)
    if (isNaN(btcPrice) || btcPrice < 0) { setFormError('Enter a valid BTC price.'); return }
    setSaving(true)
    const { trade } = modal
    const diff = trade.entry_price - btcPrice
    const pnl = parseFloat((diff * trade.quantity * 100).toFixed(2))
    const pnlPct = parseFloat(((diff / trade.entry_price) * 100).toFixed(2))
    const { error } = await supabase.from('trades').update({
      exit_price: btcPrice, pnl, pnl_pct: pnlPct, updated_at: new Date().toISOString(),
    }).eq('id', trade.id)
    if (error) { setFormError(error.message); setSaving(false); return }
    setSaving(false)
    closeModal()
    await fetchAll()
  }

  const handleAddCC = async () => {
    if (!modal || modal.type !== 'add_cc') return
    const premium = parseFloat(form.premium)
    const strike = parseFloat(form.strike)
    const contracts = parseFloat(form.contracts) || 1
    if (!form.expiration) { setFormError('Expiration is required.'); return }
    if (isNaN(premium) || premium <= 0) { setFormError('Enter a valid premium.'); return }
    if (isNaN(strike) || strike <= 0) { setFormError('Enter a valid strike price.'); return }
    if (!user) { setFormError('Session expired. Please sign in again.'); return }
    setSaving(true)
    const dte = calcDTE(form.expiration) ?? 0
    const payload: InsertTrade = {
      user_id: user.id,
      date: form.date,
      ticker: modal.cycle.ticker,
      asset_type: 'option',
      strategy: 'covered_call',
      entry_price: premium,
      quantity: contracts,
      strike,
      expiration: form.expiration,
      dte,
      delta: form.delta ? parseFloat(form.delta) : null,
      notes: form.notes.trim() || null,
      cycle_id: modal.cycleId,
    }
    const { error } = await supabase.from('trades').insert(payload)
    if (error) { setFormError(error.message); setSaving(false); return }
    setSaving(false)
    closeModal()
    await fetchAll()
  }

  const handleCallAway = async () => {
    if (!modal || modal.type !== 'call_away') return
    if (!user) { setFormError('Session expired. Please sign in again.'); return }
    setSaving(true)
    const { trade, cycleId, cycle } = modal
    const pnl = parseFloat((trade.entry_price * trade.quantity * 100).toFixed(2))
    const exitPrice = parseFloat(form.exit_price) || (trade.strike ?? 0)

    const [tradeRes, cycleRes] = await Promise.all([
      supabase.from('trades').update({
        exit_price: 0, pnl, pnl_pct: 100, updated_at: new Date().toISOString(),
      }).eq('id', trade.id),
      supabase.from('wheel_cycles').update({
        status: 'COMPLETED',
        end_date: form.date,
        shares_exit_price: exitPrice,
        updated_at: new Date().toISOString(),
      }).eq('id', cycleId),
    ])

    if (tradeRes.error) { setFormError(tradeRes.error.message); setSaving(false); return }
    if (cycleRes.error) { setFormError(cycleRes.error.message); setSaving(false); return }

    await supabase.from('portfolio_positions').delete().eq('cycle_id', cycleId)

    if (cycle.shares_cost_basis != null && cycle.shares_quantity != null) {
      const sharesPnl = parseFloat(((exitPrice - cycle.shares_cost_basis) * cycle.shares_quantity).toFixed(2))
      const sharesPnlPct = cycle.shares_cost_basis > 0
        ? parseFloat(((exitPrice - cycle.shares_cost_basis) / cycle.shares_cost_basis * 100).toFixed(2))
        : 0
      const payload: InsertTrade = {
        user_id: user.id,
        date: form.date,
        ticker: cycle.ticker,
        asset_type: 'equity',
        strategy: 'portfolio_close',
        entry_price: cycle.shares_cost_basis,
        exit_price: exitPrice,
        quantity: cycle.shares_quantity,
        pnl: sharesPnl,
        pnl_pct: sharesPnlPct,
        notes: 'Called away — Wheel cycle',
        cycle_id: cycleId,
      }
      await supabase.from('trades').insert(payload)
    }

    setSaving(false)
    closeModal()
    await fetchAll()
  }

  const handleAbandon = async () => {
    if (!modal || modal.type !== 'abandon') return
    setSaving(true)
    const { error } = await supabase.from('wheel_cycles').update({
      status: 'ABANDONED',
      end_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    }).eq('id', modal.cycleId)
    if (error) { setFormError(error.message); setSaving(false); return }
    setSaving(false)
    closeModal()
    await fetchAll()
  }

  const handleNewCycle = async () => {
    if (!form.ticker.trim()) { setFormError('Ticker is required.'); return }
    if (!form.expiration) { setFormError('Expiration is required.'); return }
    const premium = parseFloat(form.premium)
    const strike = parseFloat(form.strike)
    const contracts = parseFloat(form.contracts) || 1
    if (isNaN(premium) || premium <= 0) { setFormError('Enter a valid premium.'); return }
    if (isNaN(strike) || strike <= 0) { setFormError('Enter a valid strike.'); return }
    if (!user) { setFormError('Session expired. Please sign in again.'); return }
    setSaving(true)

    const { data: cycleData, error: cycleError } = await supabase
      .from('wheel_cycles')
      .insert({
        user_id: user.id,
        ticker: form.ticker.trim().toUpperCase(),
        status: 'ACTIVE',
        start_date: form.date,
        notes: form.notes.trim() || null,
      })
      .select()
      .single()

    if (cycleError || !cycleData) {
      setFormError(cycleError?.message ?? 'Failed to create cycle.')
      setSaving(false)
      return
    }

    const dte = calcDTE(form.expiration) ?? 0
    const payload: InsertTrade = {
      user_id: user.id,
      date: form.date,
      ticker: form.ticker.trim().toUpperCase(),
      asset_type: 'option',
      strategy: 'csp',
      entry_price: premium,
      quantity: contracts,
      strike,
      expiration: form.expiration,
      dte,
      delta: form.delta ? parseFloat(form.delta) : null,
      notes: form.notes.trim() || null,
      cycle_id: (cycleData as WheelCycle).id,
    }

    const { error: tradeError } = await supabase.from('trades').insert(payload)
    if (tradeError) { setFormError(tradeError.message); setSaving(false); return }

    setSaving(false)
    closeModal()
    await fetchAll()
  }

  // ── Derived Data ─────────────────────────────────────────────────────────────

  const cycleData = useMemo(() => {
    return cycles.map(cycle => {
      const legs = wheelTrades.filter(t => t.cycle_id === cycle.id)
      const openLeg = legs.find(t => t.exit_price === null)
      const closedLegs = legs.filter(t => t.exit_price !== null)
      const sharesPos = wheelPositions.find(p => p.cycle_id === cycle.id)
      const phase: 'CSP' | 'CC' = (sharesPos || cycle.shares_cost_basis != null) ? 'CC' : 'CSP'
      const premiumCollected = closedLegs.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
      const sharesPnl =
        cycle.shares_exit_price != null && cycle.shares_cost_basis != null && cycle.shares_quantity != null
          ? (cycle.shares_exit_price - cycle.shares_cost_basis) * cycle.shares_quantity
          : 0
      const totalPnl = premiumCollected + sharesPnl
      const dte = openLeg?.expiration ? calcDTE(openLeg.expiration) : null
      const capitalRequired =
        openLeg?.strike != null ? openLeg.strike * (openLeg.quantity ?? 1) * 100 : null
      return { cycle, legs, openLeg, closedLegs, sharesPos, phase, premiumCollected, sharesPnl, totalPnl, dte, capitalRequired }
    })
  }, [cycles, wheelTrades, wheelPositions])

  const activeCycles = useMemo(
    () => cycleData.filter(d => d.cycle.status === 'ACTIVE'),
    [cycleData]
  )
  const closedCycles = useMemo(
    () => cycleData.filter(d => d.cycle.status !== 'ACTIVE'),
    [cycleData]
  )
  const totalCspCapital = useMemo(
    () => activeCycles
      .filter(d => d.phase === 'CSP' && d.capitalRequired != null)
      .reduce((sum, d) => sum + (d.capitalRequired ?? 0), 0),
    [activeCycles]
  )
  const totalPortfolioValue = useMemo(
    () => allPositions
      .filter(p => p.ticker !== 'CASH')
      .reduce((sum, p) => sum + p.entry_price * p.quantity, 0),
    [allPositions]
  )

  const calledAwayTrades = useMemo(
    () => wheelTrades.filter(t => t.strategy === 'portfolio_close').sort((a, b) => b.date.localeCompare(a.date)),
    [wheelTrades]
  )

  const ytdPremium = useMemo(() => {
    const year = new Date().getFullYear().toString()
    return wheelTrades
      .filter(t => t.exit_price !== null && t.date.startsWith(year))
      .reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  }, [wheelTrades])

  const winRateData = useMemo(() => {
    if (closedCycles.length === 0) return null
    const wins = closedCycles.filter(d => d.totalPnl > 0).length
    return { pct: Math.round((wins / closedCycles.length) * 100), wins, total: closedCycles.length }
  }, [closedCycles])

  const avgRoc = useMemo(() => {
    const legs = wheelTrades.filter(
      t => t.exit_price !== null && t.asset_type === 'option' && t.strike != null
    )
    if (legs.length === 0) return null
    const rocs = legs.map(t => (t.pnl ?? 0) / ((t.strike ?? 1) * t.quantity * 100) * 100)
    return rocs.reduce((a, b) => a + b, 0) / rocs.length
  }, [wheelTrades])

  // Fetch live prices + option marks for active cycles
  useEffect(() => {
    if (loading || activeCycles.length === 0) return
    let cancelled = false

    const doFetch = async () => {
      setLiveLoading(true)

      const tickers = Array.from(new Set(activeCycles.map(d => d.cycle.ticker))).join(',')
      try {
        const res = await fetch(`/api/stock-quotes?symbols=${tickers}`)
        const data = await res.json()
        if (!cancelled) {
          const map: Record<string, QuoteData> = {}
          for (const q of data.quotes ?? []) map[q.symbol] = q
          setQuotes(map)
        }
      } catch { /* live data is non-critical */ }

      const openLegs = activeCycles
        .filter(d => d.openLeg?.expiration && d.openLeg?.strike != null)
        .map(d => d.openLeg!)

      const markResults = await Promise.allSettled(
        openLegs.map(leg => {
          const type = leg.strategy === 'csp' ? 'put' : 'call'
          const key = `${leg.ticker}_${leg.strike}_${leg.expiration}`
          return fetch(
            `/api/options?ticker=${leg.ticker}&expiration=${leg.expiration}&strike=${leg.strike}&type=${type}`
          )
            .then(r => r.json())
            .then(d => ({ key, data: d }))
        })
      )

      if (!cancelled) {
        const marks: Record<string, OptionMarkData> = {}
        markResults.forEach(r => {
          if (r.status === 'fulfilled' && !r.value.data.error) {
            marks[r.value.key] = r.value.data
          }
        })
        setOptionMarks(marks)
        setLiveLoading(false)
      }
    }

    doFetch()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeCycles.length])

  // ── Render ────────────────────────────────────────────────────────────────────

  const inputClass = "w-full bg-bg border border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
  const labelClass = "block text-xs text-text-muted tracking-wide uppercase mb-1.5"

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        <div className="text-text-muted text-sm animate-pulse">Loading cycles…</div>
      </div>
    )
  }

  const displayCycles = tab === 'ACTIVE' ? activeCycles : closedCycles

  return (
    <div className="p-8">
      <PageHeader
        title="Wheel Strategy"
        subtitle={`${activeCycles.length} active cycle${activeCycles.length !== 1 ? 's' : ''}`}
        action={
          <Button onClick={() => openModal({ type: 'new_cycle' })} variant="primary">
            + New Cycle
          </Button>
        }
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(() => {
          const openPuts = activeCycles.filter(d => d.phase === 'CSP' && d.capitalRequired != null)
          const pctText = totalPortfolioValue > 0 && totalCspCapital > 0
            ? `${((totalCspCapital / totalPortfolioValue) * 100).toFixed(1)}% of portfolio · ${openPuts.length} open put${openPuts.length !== 1 ? 's' : ''}`
            : 'No open puts'
          return (
            <MetricCard
              label="Capital at Risk"
              value={`$${totalCspCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              variant={totalCspCapital > 0 ? 'accent' : 'default'}
              sub={pctText}
            />
          )
        })()}
        <MetricCard
          label="YTD Premium"
          value={ytdPremium > 0 ? `+$${ytdPremium.toFixed(2)}` : ytdPremium < 0 ? `-$${Math.abs(ytdPremium).toFixed(2)}` : '$0.00'}
          variant={ytdPremium > 0 ? 'gain' : ytdPremium < 0 ? 'loss' : 'default'}
          sub="All closed wheel legs"
        />
        <MetricCard
          label="Win Rate"
          value={winRateData ? `${winRateData.pct}%` : '—'}
          variant={winRateData && winRateData.pct >= 70 ? 'gain' : 'default'}
          sub={winRateData ? `${winRateData.wins} of ${winRateData.total} cycles profitable` : 'No closed cycles'}
        />
        <MetricCard
          label="Avg ROC"
          value={avgRoc != null ? `${avgRoc > 0 ? '+' : ''}${avgRoc.toFixed(2)}%` : '—'}
          variant={avgRoc != null && avgRoc > 0 ? 'gain' : 'default'}
          sub="Per option leg (closed)"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6">
        {(['ACTIVE', 'CLOSED'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm font-semibold px-5 py-2 rounded-full border transition-all ${
              tab === t
                ? 'border-accent text-accent bg-accent/15 btn-glow'
                : 'border-default text-text-secondary hover:text-text-primary hover:border-border btn-glow-subtle'
            }`}
          >
            {t === 'ACTIVE' ? `Active (${activeCycles.length})` : `Closed (${closedCycles.length})`}
          </button>
        ))}
      </div>

      {/* Cycle Cards */}
      {displayCycles.length === 0 ? (
        <div className="border border-default bg-surface p-12 text-center rounded-xl">
          <div className="text-text-muted text-sm mb-2">
            {tab === 'ACTIVE' ? 'No active wheel cycles.' : 'No completed cycles yet.'}
          </div>
          {tab === 'ACTIVE' && (
            <div className="text-text-muted text-xs">
              Click <span className="text-accent">+ New Cycle</span> to start your first Wheel position.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayCycles.map(({ cycle, legs, openLeg, sharesPos, phase, premiumCollected, sharesPnl, totalPnl, dte, capitalRequired }) => (
            <div key={cycle.id} className="bg-surface border border-default rounded-xl overflow-hidden">

              {/* Card Header */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-default">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-text-primary font-bold text-base tracking-wider">{cycle.ticker}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    phase === 'CSP' ? 'bg-accent/10 text-accent' : 'bg-gain/10 text-gain'
                  }`}>
                    {phase} PHASE
                  </span>
                  {cycle.status !== 'ACTIVE' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      cycle.status === 'COMPLETED' ? 'bg-gain/10 text-gain' : 'bg-surface2 text-text-muted'
                    }`}>
                      {cycle.status}
                    </span>
                  )}
                  {dte !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-surface2 font-mono ${dteColor(dte)}`}>
                      {dte}d
                    </span>
                  )}
                </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs text-text-muted">Started {cycle.start_date}</span>
                    {capitalRequired != null && (
                      <span className="text-xs text-text-muted font-mono">
                        ${capitalRequired.toLocaleString()} cap
                      </span>
                    )}
                    <span className={`text-sm font-bold font-mono ${totalPnl > 0 ? 'text-gain' : totalPnl < 0 ? 'text-loss' : 'text-text-muted'}`}>
                      {totalPnl === 0 ? '$0.00' : fmt(totalPnl)}
                    </span>
                  </div>
              </div>

              {/* Live Market Data Bar */}
              {cycle.status === 'ACTIVE' && (() => {
                const quote = quotes[cycle.ticker]
                const optKey = openLeg ? `${cycle.ticker}_${openLeg.strike}_${openLeg.expiration}` : null
                const opt = optKey ? optionMarks[optKey] : null

                const pctOtm = quote && openLeg?.strike != null
                  ? phase === 'CSP'
                    ? ((quote.price - openLeg.strike) / quote.price) * 100
                    : ((openLeg.strike - quote.price) / quote.price) * 100
                  : null

                const pctMaxProfit = opt?.mark != null && openLeg && openLeg.entry_price > 0
                  ? Math.min(100, Math.max(-100, (1 - opt.mark / openLeg.entry_price) * 100))
                  : null

                // Unrealized shares P&L (CC phase)
                const sharesUnrealized = quote && cycle.shares_cost_basis != null && cycle.shares_quantity != null
                  ? (quote.price - cycle.shares_cost_basis) * cycle.shares_quantity
                  : null

                if (!quote && liveLoading) {
                  return (
                    <div className="px-5 py-2 border-b border-default bg-surface2/40 text-[10px] text-text-muted tracking-[0.14em] uppercase animate-pulse">
                      Fetching live data...
                    </div>
                  )
                }
                if (!quote) return null

                return (
                  <div className="px-5 py-2.5 border-b border-default bg-surface2/40 flex items-center gap-5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[10px] font-semibold text-text-muted tracking-[0.12em] uppercase">Price</span>
                      <span className="font-mono font-semibold text-text-primary">${quote.price.toFixed(2)}</span>
                      <span className={`text-[10px] font-semibold ${quote.changePct >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {quote.changePct >= 0 ? '+' : ''}{quote.changePct.toFixed(2)}%
                      </span>
                    </div>
                    {sharesUnrealized !== null && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[10px] font-semibold text-text-muted tracking-[0.12em] uppercase">Shares P&L</span>
                        <span className={`font-mono font-semibold ${sharesUnrealized > 0 ? 'text-gain' : sharesUnrealized < 0 ? 'text-loss' : 'text-text-muted'}`}>
                          {sharesUnrealized > 0 ? '+' : ''}{sharesUnrealized < 0 ? '-' : ''}${Math.abs(sharesUnrealized).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {pctOtm !== null && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[10px] font-semibold text-text-muted tracking-[0.12em] uppercase">OTM</span>
                        <span className={`font-mono font-semibold ${pctOtm > 0 ? 'text-gain' : 'text-loss'}`}>
                          {pctOtm > 0 ? '+' : ''}{pctOtm.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {opt?.mark != null && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[10px] font-semibold text-text-muted tracking-[0.12em] uppercase">Mark</span>
                        <span className="font-mono text-text-primary">${opt.mark.toFixed(2)}</span>
                        {opt.bid != null && opt.ask != null && (
                          <span className="text-[10px] font-mono text-text-muted">
                            ({opt.bid.toFixed(2)} / {opt.ask.toFixed(2)})
                          </span>
                        )}
                      </div>
                    )}
                    {pctMaxProfit !== null && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[10px] font-semibold text-text-muted tracking-[0.12em] uppercase">Max Profit</span>
                        <span className={`font-mono font-semibold ${pctMaxProfit >= 50 ? 'text-gain' : pctMaxProfit >= 0 ? 'text-amber' : 'text-loss'}`}>
                          {pctMaxProfit.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {opt?.iv != null && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[10px] font-semibold text-text-muted tracking-[0.12em] uppercase">IV</span>
                        <span className="font-mono text-text-secondary">{(opt.iv * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Legs Table */}
              {legs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-default bg-surface2">
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Leg</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Strike</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Expiration</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Contracts</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Premium</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">P&L</th>
                        <th className="px-4 py-3 text-center text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {legs.map(leg => {
                        const isOpen = leg.exit_price === null
                        const legDte = leg.expiration ? calcDTE(leg.expiration) : null
                        return (
                          <tr
                            key={leg.id}
                            className={`border-b border-default last:border-0 ${isOpen ? 'bg-accent/5' : 'bg-bg'}`}
                          >
                            <td className="px-4 py-3 font-mono text-text-secondary">{leg.date}</td>
                            <td className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wide">
                              {leg.strategy === 'csp' ? 'CSP' : 'CC'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-text-primary">
                              {leg.strike != null ? `$${leg.strike}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-text-secondary">
                              {leg.expiration ?? '—'}
                              {isOpen && legDte !== null && (
                                <span className={`ml-1.5 ${dteColor(legDte)}`}>({legDte}d)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-text-secondary">
                              {leg.quantity}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-text-primary">
                              ${(leg.entry_price * leg.quantity * 100).toFixed(2)}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono font-bold ${
                              isOpen ? 'text-text-muted' : (leg.pnl ?? 0) > 0 ? 'text-gain' : (leg.pnl ?? 0) < 0 ? 'text-loss' : 'text-text-muted'
                            }`}>
                              {isOpen ? 'open' : leg.pnl != null ? fmt(leg.pnl) : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isOpen ? 'bg-accent/10 text-accent' : 'bg-gain/10 text-gain'
                              }`}>
                                {isOpen ? 'OPEN' : 'CLOSED'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Shares Row */}
              {(sharesPos || cycle.shares_cost_basis != null) && (
                <div className="px-5 py-3 border-t border-default flex items-center gap-4 text-xs bg-surface2 flex-wrap">
                  <span className="text-text-muted uppercase tracking-wide font-medium">Shares</span>
                  <span className="font-mono text-text-primary">
                    {cycle.shares_quantity ?? sharesPos?.quantity ?? 0} shares @{' '}
                    ${(cycle.shares_cost_basis ?? sharesPos?.entry_price ?? 0).toFixed(2)}
                  </span>
                  {sharesPos?.current_price != null && (
                    <span className={`font-mono ${
                      sharesPos.current_price >= sharesPos.entry_price ? 'text-gain' : 'text-loss'
                    }`}>
                      Current: ${sharesPos.current_price.toFixed(2)}{' '}
                      ({fmt((sharesPos.current_price - sharesPos.entry_price) * sharesPos.quantity)})
                    </span>
                  )}
                  {cycle.shares_exit_price != null && (
                    <span className={`font-mono font-bold ${sharesPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                      Called @ ${cycle.shares_exit_price.toFixed(2)} → {fmt(sharesPnl)}
                    </span>
                  )}
                </div>
              )}

              {/* Footer: Actions (active only) */}
              {cycle.status === 'ACTIVE' && (
                <div className="px-5 py-3 border-t border-default flex items-center justify-between gap-4">
                  <div className="text-xs text-text-muted">
                    Premium collected:{' '}
                    <span className={`font-mono font-bold ${premiumCollected >= 0 ? 'text-gain' : 'text-loss'}`}>
                      {fmt(premiumCollected)}
                    </span>
                    {' · '}{legs.length} leg{legs.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {openLeg && phase === 'CSP' && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => handleMarkExpired(openLeg)}>
                          ✓ Expired
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openModal({ type: 'mark_assigned', cycleId: cycle.id, trade: openLeg })}
                        >
                          → Assigned
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openModal({ type: 'btc', cycleId: cycle.id, trade: openLeg })}
                        >
                          BTC
                        </Button>
                      </>
                    )}
                    {openLeg && phase === 'CC' && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => handleMarkExpired(openLeg)}>
                          ✓ Expired
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openModal({ type: 'call_away', cycleId: cycle.id, trade: openLeg, cycle })}
                        >
                          → Called Away
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openModal({ type: 'btc', cycleId: cycle.id, trade: openLeg })}
                        >
                          BTC
                        </Button>
                      </>
                    )}
                    {!openLeg && phase === 'CC' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openModal({
                          type: 'add_cc',
                          cycleId: cycle.id,
                          cycle,
                          contracts: legs[0]?.quantity ?? 1,
                        })}
                      >
                        + Add CC
                      </Button>
                    )}
                    {!openLeg && phase === 'CSP' && legs.length > 0 && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (!window.confirm(`Start a brand-new Wheel cycle? This will open a separate cycle — the current ${cycle.ticker} cycle remains open.`)) return
                          openModal({ type: 'new_cycle' })
                        }}
                      >
                        New CSP
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openModal({ type: 'abandon', cycleId: cycle.id })}
                    >
                      Abandon
                    </Button>
                  </div>
                </div>
              )}

              {/* Footer: Summary (completed/abandoned) */}
              {cycle.status !== 'ACTIVE' && (
                <div className="px-5 py-3 border-t border-default flex items-center justify-between bg-surface2">
                  <div className="text-xs text-text-muted font-mono">
                    {cycle.start_date} → {cycle.end_date ?? '—'}
                    {' · '}{legs.length} legs
                  </div>
                  <div className={`text-sm font-bold font-mono ${totalPnl > 0 ? 'text-gain' : totalPnl < 0 ? 'text-loss' : 'text-text-muted'}`}>
                    Total: {totalPnl === 0 ? '$0.00' : fmt(totalPnl)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Called Away History ── */}
      {calledAwayTrades.length > 0 && (
        <div className="mt-8 border border-default rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-default bg-surface2/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-0.5 h-3.5 rounded-full bg-gain/60 inline-block" />
              <span className="text-xs font-semibold text-text-secondary tracking-[0.08em] uppercase">Called Away</span>
              <span className="text-[10px] font-mono text-text-muted">{calledAwayTrades.length} cycle{calledAwayTrades.length !== 1 ? 's' : ''}</span>
            </div>
            {(() => {
              const totalPnl = calledAwayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
              return (
                <span className={`text-xs font-mono font-semibold ${totalPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)} total
                </span>
              )
            })()}
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-default bg-surface">
                {['Date', 'Ticker', 'Qty', 'Cost Basis', 'Exit Price', 'P&L', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-text-muted tracking-[0.12em] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calledAwayTrades.map((t, i) => (
                <tr key={t.id} className={`border-b border-default/40 hover:bg-surface2/30 transition-colors ${i % 2 === 0 ? 'bg-surface' : 'bg-bg'}`}>
                  <td className="px-4 py-3 font-mono text-text-muted">{t.date}</td>
                  <td className="px-4 py-3 font-bold text-text-primary tracking-wider">{t.ticker}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{t.quantity}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{t.entry_price != null ? `$${t.entry_price.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{t.exit_price != null ? `$${t.exit_price.toFixed(2)}` : '—'}</td>
                  <td className={`px-4 py-3 font-mono font-semibold ${(t.pnl ?? 0) >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {t.pnl != null ? `${t.pnl >= 0 ? '+' : '-'}$${Math.abs(t.pnl).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{t.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}

      {/* New Cycle */}
      <Modal open={modal?.type === 'new_cycle'} onClose={closeModal} title="Start New Wheel Cycle" width="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Open Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ticker</label>
              <input
                type="text"
                value={form.ticker}
                onChange={e => setForm(p => ({ ...p, ticker: e.target.value.toUpperCase() }))}
                placeholder="AAPL"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Strike</label>
              <input
                type="number"
                step="0.50"
                value={form.strike}
                onChange={e => setForm(p => ({ ...p, strike: e.target.value }))}
                placeholder="180.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Expiration</label>
              <input
                type="date"
                value={form.expiration}
                onChange={e => setForm(p => ({ ...p, expiration: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contracts</label>
              <input
                type="number"
                step="1"
                min="1"
                value={form.contracts}
                onChange={e => setForm(p => ({ ...p, contracts: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Premium per Contract</label>
            <input
              type="number"
              step="0.01"
              value={form.premium}
              onChange={e => setForm(p => ({ ...p, premium: e.target.value }))}
              placeholder="2.50"
              className={inputClass}
            />
            {(form.strike || form.premium) && (
              <div className="bg-surface2 rounded-lg p-3 mt-2 space-y-1.5">
                {form.strike && !isNaN(parseFloat(form.strike)) && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Cost of Assignment</span>
                    <span className="font-mono text-text-primary">
                      ${(parseFloat(form.strike) * (parseFloat(form.contracts) || 1) * 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {form.strike && form.premium && !isNaN(parseFloat(form.strike)) && !isNaN(parseFloat(form.premium)) && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Break Even / Share</span>
                    <span className="font-mono text-text-primary">
                      ${(parseFloat(form.strike) - parseFloat(form.premium)).toFixed(2)}
                    </span>
                  </div>
                )}
                {form.premium && !isNaN(parseFloat(form.premium)) && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Total Premium</span>
                    <span className="font-mono text-gain">
                      ${(parseFloat(form.premium) * (parseFloat(form.contracts) || 1) * 100).toFixed(2)}
                    </span>
                  </div>
                )}
                {form.strike && form.premium && !isNaN(parseFloat(form.strike)) && !isNaN(parseFloat(form.premium)) && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">ROC</span>
                    <span className="font-mono text-gain">
                      {((parseFloat(form.premium) / parseFloat(form.strike)) * 100).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Delta (optional)</label>
            <input
              type="number"
              step="0.01"
              min="-1"
              max="0"
              value={form.delta}
              onChange={e => setForm(p => ({ ...p, delta: e.target.value }))}
              placeholder="e.g. -0.30"
              className={inputClass}
            />
          </div>
          {formError && (
            <div className="text-loss text-xs bg-loss/10 border border-loss/30 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleNewCycle} disabled={saving}>
              {saving ? 'Saving...' : 'Start Cycle'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mark Assigned */}
      <Modal
        open={modal?.type === 'mark_assigned'}
        onClose={closeModal}
        title="CSP Assigned — Shares Acquired"
        width="max-w-sm"
      >
        <div className="space-y-4">
          <div className="bg-surface2 rounded-lg p-3 text-xs text-text-muted">
            The put was exercised. You keep the full premium and now own the shares at the strike price.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Shares Acquired</label>
              <input
                type="number"
                value={form.shares}
                onChange={e => setForm(p => ({ ...p, shares: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cost per Share</label>
              <input
                type="number"
                step="0.01"
                value={form.cost_basis}
                onChange={e => setForm(p => ({ ...p, cost_basis: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          {form.cost_basis && form.shares && !isNaN(parseFloat(form.cost_basis)) && (
            <div className="text-xs text-text-muted bg-surface2 rounded-lg p-3">
              Capital deployed:{' '}
              <span className="font-mono text-text-primary">
                ${(parseFloat(form.cost_basis) * parseFloat(form.shares)).toLocaleString()}
              </span>
            </div>
          )}
          {formError && (
            <div className="text-loss text-xs bg-loss/10 border border-loss/30 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleMarkAssigned} disabled={saving}>
              {saving ? 'Saving...' : 'Confirm Assignment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* BTC (Buy to Close) */}
      <Modal
        open={modal?.type === 'btc'}
        onClose={closeModal}
        title="Close Early (Buy to Close)"
        width="max-w-sm"
      >
        <div className="space-y-4">
          {modal?.type === 'btc' && (
            <div className="bg-surface2 rounded-lg p-3 text-xs text-text-muted">
              Premium received:{' '}
              <span className="font-mono text-text-primary">${modal.trade.entry_price.toFixed(2)}</span>
              {' · '}Contracts:{' '}
              <span className="font-mono text-text-primary">{modal.trade.quantity}</span>
            </div>
          )}
          <div>
            <label className={labelClass}>BTC Price per Contract</label>
            <input
              type="number"
              step="0.01"
              value={form.btc_price}
              onChange={e => setForm(p => ({ ...p, btc_price: e.target.value }))}
              placeholder="0.00"
              className={inputClass}
            />
            {modal?.type === 'btc' && form.btc_price && !isNaN(parseFloat(form.btc_price)) && (
              <div className="text-xs mt-1.5">
                {(() => {
                  const diff = modal.trade.entry_price - parseFloat(form.btc_price)
                  const pnl = diff * modal.trade.quantity * 100
                  return (
                    <span className={pnl >= 0 ? 'text-gain' : 'text-loss'}>
                      P&L: {fmt(pnl)}
                    </span>
                  )
                })()}
              </div>
            )}
          </div>
          {formError && (
            <div className="text-loss text-xs bg-loss/10 border border-loss/30 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleBTC} disabled={saving}>
              {saving ? 'Saving...' : 'Close Position'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add CC */}
      <Modal
        open={modal?.type === 'add_cc'}
        onClose={closeModal}
        title="Sell Covered Call"
        width="max-w-lg"
      >
        <div className="space-y-4">
          {modal?.type === 'add_cc' && (
            <div className="bg-surface2 rounded-lg p-3 text-xs text-text-muted">
              Selling CC against{' '}
              <span className="text-text-primary font-bold">{modal.cycle.ticker}</span> shares
              {modal.cycle.shares_cost_basis != null && (
                <span className="ml-2">
                  · Cost basis:{' '}
                  <span className="text-text-primary font-mono">
                    ${modal.cycle.shares_cost_basis.toFixed(2)}/share
                  </span>
                </span>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Open Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contracts</label>
              <input
                type="number"
                step="1"
                min="1"
                value={form.contracts}
                onChange={e => setForm(p => ({ ...p, contracts: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Strike</label>
              <input
                type="number"
                step="0.50"
                value={form.strike}
                onChange={e => setForm(p => ({ ...p, strike: e.target.value }))}
                placeholder="185.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Expiration</label>
              <input
                type="date"
                value={form.expiration}
                onChange={e => setForm(p => ({ ...p, expiration: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Premium / Contract</label>
              <input
                type="number"
                step="0.01"
                value={form.premium}
                onChange={e => setForm(p => ({ ...p, premium: e.target.value }))}
                placeholder="1.50"
                className={inputClass}
              />
            </div>
          </div>
          {form.premium && form.contracts && !isNaN(parseFloat(form.premium)) && (
            <div className="text-xs text-text-muted">
              Total premium:{' '}
              <span className="text-gain font-mono">
                ${(parseFloat(form.premium) * parseFloat(form.contracts) * 100).toFixed(2)}
              </span>
            </div>
          )}
          <div>
            <label className={labelClass}>Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Delta (optional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.delta}
              onChange={e => setForm(p => ({ ...p, delta: e.target.value }))}
              placeholder="e.g. 0.30"
              className={inputClass}
            />
          </div>
          {formError && (
            <div className="text-loss text-xs bg-loss/10 border border-loss/30 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAddCC} disabled={saving}>
              {saving ? 'Saving...' : 'Sell Call'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Shares Called Away */}
      <Modal
        open={modal?.type === 'call_away'}
        onClose={closeModal}
        title="Shares Called Away"
        width="max-w-sm"
      >
        <div className="space-y-4">
          <div className="bg-surface2 rounded-lg p-3 text-xs text-text-muted">
            Shares sold at the call strike. Full CC premium is kept. Cycle will be marked complete.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date Called</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Shares Sold at</label>
              <input
                type="number"
                step="0.01"
                value={form.exit_price}
                onChange={e => setForm(p => ({ ...p, exit_price: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          {modal?.type === 'call_away' &&
            form.exit_price &&
            modal.cycle.shares_cost_basis != null &&
            modal.cycle.shares_quantity != null &&
            !isNaN(parseFloat(form.exit_price)) && (
              <div className="text-xs bg-surface2 rounded-lg p-3">
                Shares gain:{' '}
                <span className={`font-mono font-bold ${
                  (parseFloat(form.exit_price) - modal.cycle.shares_cost_basis) * modal.cycle.shares_quantity >= 0
                    ? 'text-gain'
                    : 'text-loss'
                }`}>
                  {fmt((parseFloat(form.exit_price) - modal.cycle.shares_cost_basis) * modal.cycle.shares_quantity)}
                </span>
              </div>
            )}
          {formError && (
            <div className="text-loss text-xs bg-loss/10 border border-loss/30 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCallAway} disabled={saving}>
              {saving ? 'Saving...' : 'Complete Cycle'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Abandon */}
      <Modal
        open={modal?.type === 'abandon'}
        onClose={closeModal}
        title="Abandon Cycle"
        width="max-w-sm"
      >
        <div className="space-y-4">
          <div className="text-sm text-text-secondary">
            Mark this cycle as abandoned. All leg records are preserved in your Trade Log.
          </div>
          {formError && (
            <div className="text-loss text-xs bg-loss/10 border border-loss/30 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleAbandon} disabled={saving}>
              {saving ? '...' : 'Abandon'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
