'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Trade, InsertTrade, UpdateTrade, AssetType, TradeStrategy, TradeGroup, InsertTradeGroup } from '@/types/database'
import { STRATEGY_LABELS, OPTION_STRATEGIES, EQUITY_STRATEGIES } from '@/types/database'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { TickerLogo } from '@/components/ui/TickerLogo'

const STRATEGY_SHORT: Record<string, string> = {
  csp: 'CSP',
  csp_roll: 'CSP Roll',
  covered_call: 'CC',
  covered_call_roll: 'CC Roll',
  pmcc: 'PMCC',
  call_debit_spread: 'CDS',
  put_debit_spread: 'PDS',
  call_credit_spread: 'CCS',
  put_credit_spread: 'PCS',
  iron_condor: 'IC',
  iron_butterfly: 'IFly',
  long_call: 'Long C',
  long_put: 'Long P',
  equity_long: 'Long',
  equity_short: 'Short',
  wheel: 'Wheel',
  straddle: 'Straddle',
  strangle: 'Strangle',
  portfolio_close: 'Close',
}

const MISTAKE_TAGS = [
  { value: 'fomo',          label: 'FOMO',             cls: 'text-amber bg-amber/10 border-amber/30' },
  { value: 'revenge',       label: 'Revenge Trade',    cls: 'text-loss bg-loss/10 border-loss/30' },
  { value: 'oversize',      label: 'Oversize Position',cls: 'text-loss bg-loss/10 border-loss/30' },
  { value: 'early_exit',    label: 'Too Early',        cls: 'text-amber bg-amber/10 border-amber/30' },
  { value: 'late_exit',     label: 'Held Too Long',    cls: 'text-amber bg-amber/10 border-amber/30' },
  { value: 'no_plan',       label: 'No Plan',          cls: 'text-accent bg-accent/10 border-accent/30' },
  { value: 'chased',        label: 'Chased Entry',     cls: 'text-amber bg-amber/10 border-amber/30' },
  { value: 'broke_rules',   label: 'Broke Rules',      cls: 'text-loss bg-loss/10 border-loss/30' },
  { value: 'emotional',     label: 'Emotional',        cls: 'text-accent bg-accent/10 border-accent/30' },
  { value: 'over_leveraged',label: 'Over-leveraged',   cls: 'text-loss bg-loss/10 border-loss/30' },
] as const

const MISTAKE_LABEL: Record<string, string> = Object.fromEntries(MISTAKE_TAGS.map(t => [t.value, t.label]))

interface LegDef { label: string; direction: 'credit' | 'debit' }

const STRATEGY_LEGS: Partial<Record<string, LegDef[]>> = {
  iron_condor: [
    { label: 'Short Put',         direction: 'credit' },
    { label: 'Long Put',          direction: 'debit'  },
    { label: 'Short Call',        direction: 'credit' },
    { label: 'Long Call',         direction: 'debit'  },
  ],
  debit_spread:  [{ label: 'Long Leg',          direction: 'debit'  }, { label: 'Short Leg',         direction: 'credit' }],
  credit_spread: [{ label: 'Short Leg',         direction: 'credit' }, { label: 'Long Leg',          direction: 'debit'  }],
  collar:        [{ label: 'Long Put',          direction: 'debit'  }, { label: 'Short Call',        direction: 'credit' }],
  calendar:      [{ label: 'Short Near-Term',   direction: 'credit' }, { label: 'Long Far-Term',     direction: 'debit'  }],
  strangle:      [{ label: 'Short Put',         direction: 'credit' }, { label: 'Short Call',        direction: 'credit' }],
  straddle:      [{ label: 'Short Put',         direction: 'credit' }, { label: 'Short Call',        direction: 'credit' }],
}

function isMultiLeg(strategy: string): boolean { return strategy in STRATEGY_LEGS }

interface LegFormValues { entry_price: string; exit_price: string; quantity: string; strike: string; expiration: string }

function defaultLeg(): LegFormValues { return { entry_price: '', exit_price: '', quantity: '', strike: '', expiration: '' } }

function computeLegPnl(leg: LegFormValues, direction: 'credit' | 'debit'): { pnl: number | null; pnl_pct: number | null } {
  const entry = parseFloat(leg.entry_price)
  const exit = parseFloat(leg.exit_price)
  if (!leg.exit_price || isNaN(entry) || isNaN(exit) || entry <= 0) return { pnl: null, pnl_pct: null }
  const qty = parseFloat(leg.quantity) || 1
  const diff = direction === 'credit' ? entry - exit : exit - entry
  return { pnl: diff * qty * 100, pnl_pct: (diff / entry) * 100 }
}

interface TradeFormValues {
  date: string
  ticker: string
  asset_type: AssetType
  strategy: TradeStrategy | string
  entry_price: string
  exit_price: string
  quantity: string
  pnl: string
  pnl_pct: string
  strike: string
  expiration: string
  notes: string
  mistake_tags: string[]
  group_mode: 'standalone' | 'new' | 'existing'
  group_new_label: string
  group_existing_id: string
  legs: LegFormValues[]
}

function calcDTEFromExpiration(expiration: string): number {
  if (!expiration) return 0
  const diff = new Date(expiration).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

const defaultForm = (): TradeFormValues => ({
  date: new Date().toISOString().slice(0, 10),
  ticker: '',
  asset_type: 'equity',
  strategy: 'equity_long',
  entry_price: '',
  exit_price: '',
  quantity: '',
  pnl: '',
  pnl_pct: '',
  strike: '',
  expiration: '',
  notes: '',
  mistake_tags: [],
  group_mode: 'standalone',
  group_new_label: '',
  group_existing_id: '',
  legs: [],
})

type SortKey = 'date' | 'ticker' | 'pnl'
type SortDir = 'asc' | 'desc'

export default function TradeLogPage() {
  const { user } = useAuth()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [form, setForm] = useState<TradeFormValues>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const [tradeGroups, setTradeGroups] = useState<TradeGroup[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchAll = async () => {
    if (!user) {
      setLoading(false)
      return
    }
    const [tradesRes, groupsRes] = await Promise.all([
      supabase.from('trades').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('trade_groups').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    if (tradesRes.error) notify(`Failed to load trades: ${tradesRes.error.message}`, false)
    if (groupsRes.error) notify(`Failed to load groups: ${groupsRes.error.message}`, false)
    setTrades(tradesRes.data ?? [])
    setTradeGroups(groupsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    const openTickers = [...new Set(
      trades.filter(t => t.exit_price === null).map(t => t.ticker)
    )]
    if (openTickers.length === 0) return
    fetch(`/api/stock-quotes?symbols=${openTickers.join(',')}`)
      .then(r => r.json())
      .then((d: { quotes: Array<{ symbol: string; price: number }> }) => {
        const map: Record<string, number> = {}
        d.quotes.forEach(q => { map[q.symbol] = q.price })
        setLivePrices(map)
      })
      .catch(() => {})
  }, [trades])

  // Auto-calculate P/L when entry, exit, quantity, or asset_type changes
  useEffect(() => {
    const entry = parseFloat(form.entry_price)
    const exit = parseFloat(form.exit_price)
    if (!isNaN(entry) && entry > 0 && !isNaN(exit)) {
      const multiplier = form.asset_type === 'option' ? 100 : 1
      const qty = parseFloat(form.quantity) || 1
      // CSPs are credit strategies: profit = premium received minus cost to close
      const diff = form.strategy === 'csp' ? entry - exit : exit - entry
      const pnl = diff * qty * multiplier
      const pnl_pct = (diff / entry) * 100
      setForm(f => ({ ...f, pnl: pnl.toFixed(2), pnl_pct: pnl_pct.toFixed(2) }))
    } else if (!form.exit_price) {
      setForm(f => ({ ...f, pnl: '', pnl_pct: '' }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.entry_price, form.exit_price, form.quantity, form.asset_type, form.strategy])

  const openAdd = () => {
    setEditingTrade(null)
    setForm(defaultForm())
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (trade: Trade) => {
    setEditingTrade(trade)
    setForm({
      date: trade.date,
      ticker: trade.ticker,
      asset_type: trade.asset_type,
      strategy: trade.strategy,
      entry_price: trade.entry_price?.toString() ?? '',
      exit_price: trade.exit_price?.toString() ?? '',
      quantity: trade.quantity?.toString() ?? '',
      pnl: trade.pnl?.toString() ?? '',
      pnl_pct: trade.pnl_pct?.toString() ?? '',
      strike: trade.strike?.toString() ?? '',
      expiration: trade.expiration ?? '',
      notes: trade.notes ?? '',
      mistake_tags: trade.mistake_tags ?? [],
      group_mode: trade.group_id ? 'existing' : 'standalone',
      group_new_label: '',
      group_existing_id: trade.group_id ?? '',
      legs: [],
    })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingTrade(null)
    setFormError(null)
  }

  const handleAssetTypeChange = (value: AssetType) => {
    const defaultStrategy = value === 'option' ? 'csp' : 'equity_long'
    setForm(prev => ({ ...prev, asset_type: value, strategy: defaultStrategy, legs: [] }))
  }

  const handleStrategyChange = (strategy: string) => {
    const newLegs = isMultiLeg(strategy) ? (STRATEGY_LEGS[strategy]!.map(() => defaultLeg())) : []
    setForm(prev => ({ ...prev, strategy: strategy as TradeStrategy, legs: newLegs, group_new_label: '' }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.ticker.trim()) {
      setFormError('Ticker is required.')
      return
    }

    // Multi-leg path
    const isML = !editingTrade && isMultiLeg(form.strategy) && form.legs.length > 0
    if (isML) {
      for (let i = 0; i < form.legs.length; i++) {
        if (!form.legs[i].entry_price || isNaN(Number(form.legs[i].entry_price))) {
          setFormError(`Leg ${i + 1} (${STRATEGY_LEGS[form.strategy]![i].label}): entry price is required.`)
          return
        }
      }
      setSaving(true)
      const spreadLabel = form.group_new_label.trim() ||
        `${form.ticker.trim().toUpperCase()} ${STRATEGY_LABELS[form.strategy] ?? form.strategy} ${form.date}`
      const { data: newGroup, error: groupErr } = await supabase
        .from('trade_groups')
        .insert({ user_id: user!.id, label: spreadLabel } satisfies InsertTradeGroup)
        .select().single()
      if (groupErr || !newGroup) {
        setFormError(groupErr?.message ?? 'Failed to create spread group.')
        setSaving(false)
        return
      }
      const legDefs = STRATEGY_LEGS[form.strategy]!
      const insertLegs: InsertTrade[] = form.legs.map((leg, i) => {
        const { pnl, pnl_pct } = computeLegPnl(leg, legDefs[i].direction)
        const entryVal = parseFloat(leg.entry_price)
        const exitVal = leg.exit_price ? parseFloat(leg.exit_price) : null
        return {
          user_id: user!.id,
          date: form.date,
          ticker: form.ticker.trim().toUpperCase(),
          asset_type: 'option' as AssetType,
          strategy: form.strategy,
          entry_price: entryVal,
          exit_price: exitVal,
          quantity: leg.quantity ? parseFloat(leg.quantity) : 1,
          pnl: exitVal !== null ? pnl : null,
          pnl_pct: exitVal !== null ? pnl_pct : null,
          strike: leg.strike ? parseFloat(leg.strike) : null,
          expiration: leg.expiration || null,
          delta: null,
          dte: leg.expiration ? calcDTEFromExpiration(leg.expiration) : null,
          notes: form.notes.trim() || null,
          mistake_tags: form.mistake_tags.length > 0 ? form.mistake_tags : null,
          group_id: newGroup.id,
        }
      })
      const { error: insertErr } = await supabase.from('trades').insert(insertLegs)
      if (insertErr) {
        setFormError(insertErr.message)
        setSaving(false)
        return
      }
      setSaving(false)
      closeModal()
      notify('Spread logged.')
      await fetchAll()
      return
    }

    if (!form.entry_price || isNaN(Number(form.entry_price))) {
      setFormError('Entry price must be a valid number.')
      return
    }
    if (form.group_mode === 'new' && !form.group_new_label.trim()) {
      setFormError('Spread label is required.')
      return
    }
    if (form.group_mode === 'existing' && !form.group_existing_id) {
      setFormError('Select a spread to link this trade to.')
      return
    }

    setSaving(true)

    // Resolve group_id
    let resolvedGroupId: string | null = null
    if (form.group_mode === 'new') {
      const { data: newGroup, error: groupErr } = await supabase
        .from('trade_groups')
        .insert({ user_id: user!.id, label: form.group_new_label.trim() } satisfies InsertTradeGroup)
        .select()
        .single()
      if (groupErr || !newGroup) {
        setFormError(groupErr?.message ?? 'Failed to create spread group.')
        setSaving(false)
        return
      }
      resolvedGroupId = newGroup.id
    } else if (form.group_mode === 'existing') {
      resolvedGroupId = form.group_existing_id
    }

    const strategies = form.asset_type === 'option' ? OPTION_STRATEGIES : EQUITY_STRATEGIES
    const strategy = strategies.includes(form.strategy as TradeStrategy) ? form.strategy : strategies[0]

    const payload = {
      date: form.date,
      ticker: form.ticker.trim().toUpperCase(),
      asset_type: form.asset_type,
      strategy,
      entry_price: parseFloat(form.entry_price),
      exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
      quantity: form.quantity ? parseFloat(form.quantity) : 1,
      pnl: form.pnl ? parseFloat(form.pnl) : null,
      pnl_pct: form.pnl_pct ? parseFloat(form.pnl_pct) : null,
      strike: form.asset_type === 'option' && form.strike ? parseFloat(form.strike) : null,
      expiration: form.asset_type === 'option' && form.expiration ? form.expiration : null,
      delta: null,
      dte: form.asset_type === 'option' && form.expiration ? calcDTEFromExpiration(form.expiration) : null,
      notes: form.notes.trim() || null,
      mistake_tags: form.mistake_tags.length > 0 ? form.mistake_tags : null,
      group_id: resolvedGroupId,
    }

    if (editingTrade) {
      const updatePayload: UpdateTrade = { ...payload, updated_at: new Date().toISOString() }
      const { error } = await supabase
        .from('trades')
        .update(updatePayload)
        .eq('id', editingTrade.id)
      if (error) {
        setFormError(error.message)
        setSaving(false)
        return
      }
    } else {
      if (!user) {
        setFormError('Session expired. Please sign in again.')
        setSaving(false)
        return
      }

      const insertPayload: InsertTrade = { ...payload, user_id: user.id }
      const { error } = await supabase.from('trades').insert(insertPayload)
      if (error) {
        setFormError(error.message)
        setSaving(false)
        return
      }
    }

    const isEditing = !!editingTrade
    setSaving(false)
    closeModal()
    notify(isEditing ? 'Trade updated.' : 'Trade added.')
    await fetchAll()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this trade?')) return
    const { error } = await supabase.from('trades').delete().eq('id', id)
    if (error) { notify(`Delete failed: ${error.message}`, false); return }
    await fetchAll()
  }

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDeleteGroup = async (groupId: string) => {
    const { error } = await supabase.from('trade_groups').delete().eq('id', groupId)
    if (error) { notify(`Delete failed: ${error.message}`, false); return }
    setDeletingGroupId(null)
    setExpandedGroups(prev => { const next = new Set(prev); next.delete(groupId); return next })
    notify('Spread group deleted. Trades remain in the log.')
    await fetchAll()
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...trades].sort((a, b) => {
    let va: string | number
    let vb: string | number
    if (sortKey === 'date') {
      va = a.date
      vb = b.date
    } else if (sortKey === 'pnl') {
      va = a.pnl ?? 0
      vb = b.pnl ?? 0
    } else {
      va = a.ticker
      vb = b.ticker
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const strategyOptions = form.asset_type === 'option' ? OPTION_STRATEGIES : EQUITY_STRATEGIES

  const updateLeg = (i: number, field: keyof LegFormValues, value: string) => {
    setForm(p => {
      const next = [...p.legs]
      next[i] = { ...next[i], [field]: value }
      return { ...p, legs: next }
    })
  }

  const isMultiLegMode = !editingTrade && isMultiLeg(form.strategy) && form.legs.length > 0

  const tradesByGroup = trades.reduce<Record<string, Trade[]>>((acc, t) => {
    if (t.group_id) { (acc[t.group_id] ??= []).push(t) }
    return acc
  }, {})

  const inputClass = "w-full bg-bg border border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
  const readonlyInputClass = "w-full bg-surface2 border border-default/50 rounded-lg px-3 py-2 text-sm text-text-secondary cursor-not-allowed"
  const labelClass = "block text-xs text-text-muted tracking-wide uppercase mb-1.5"

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        <div className="text-text-muted text-sm animate-pulse">Loading trades…</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border text-sm font-mono shadow-xl transition-all ${
          toast.ok ? 'bg-gain/10 border-gain/30 text-gain' : 'bg-loss/10 border-loss/30 text-loss'
        }`}>
          {toast.msg}
        </div>
      )}
      <PageHeader
        title="Trade Log"
        subtitle={`${trades.length} total trades`}
        action={
          <Button onClick={openAdd} variant="primary">+ Add Trade</Button>
        }
      />

      {/* ── Spreads & Grouped Positions ── */}
      {tradeGroups.length > 0 && (
        <div className="mb-8">
          <div className="text-xs text-text-muted tracking-widest uppercase mb-3 font-semibold">
            Spreads &amp; Grouped Positions
          </div>
          <div className="space-y-3">
            {tradeGroups.map(group => {
              const legs = tradesByGroup[group.id] ?? []
              const isExpanded = expandedGroups.has(group.id)
              const isOpen = legs.some(t => t.exit_price === null)
              const closedLegs = legs.filter(t => t.exit_price !== null)
              const netPnl = closedLegs.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
              const isEmpty = legs.length === 0
              const confirmingDelete = deletingGroupId === group.id
              const pnlColor = netPnl > 0 ? 'text-gain' : netPnl < 0 ? 'text-loss' : 'text-text-muted'

              return (
                <div key={group.id} className="border border-default rounded-xl overflow-hidden bg-surface">
                  {/* Card header */}
                  <div
                    className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-surface2 transition-colors select-none"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-text-muted text-[10px] transition-transform ${isExpanded ? 'rotate-90' : ''} inline-block`}>▶</span>
                      <span className="text-text-primary font-bold text-sm tracking-wide">{group.label}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isEmpty
                          ? 'text-text-muted border-default bg-surface2'
                          : isOpen
                          ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                          : 'text-gain border-gain/30 bg-gain/10'
                      }`}>
                        {isEmpty ? 'EMPTY' : isOpen ? 'OPEN' : 'CLOSED'}
                      </span>
                      {!isEmpty && (
                        <span className="text-[10px] text-text-muted">
                          {legs.length} leg{legs.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className={`text-sm font-bold font-mono ${pnlColor}`}>
                        {isEmpty ? '—' : isOpen && closedLegs.length === 0 ? (
                          <span className="text-text-muted text-xs font-normal">Open</span>
                        ) : (
                          <>
                            {netPnl >= 0 ? '+' : ''}${Math.abs(netPnl).toFixed(2)}
                            {isOpen && <span className="text-[10px] font-normal text-text-muted ml-1">(realized)</span>}
                          </>
                        )}
                      </span>
                      <div onClick={e => e.stopPropagation()}>
                        {confirmingDelete ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-muted">Delete group?</span>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="text-[10px] font-semibold text-loss hover:text-loss/80 tracking-[0.1em] uppercase"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingGroupId(null)}
                              className="text-[10px] font-semibold text-text-muted hover:text-text-primary tracking-[0.1em] uppercase"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingGroupId(group.id)}
                            className="text-[10px] font-semibold tracking-[0.1em] uppercase text-text-muted hover:text-loss transition-colors"
                          >
                            Delete Group
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded legs */}
                  {isExpanded && (
                    <div className="border-t border-default">
                      {legs.length === 0 ? (
                        <div className="px-5 py-4 text-xs text-text-muted italic">
                          No legs yet. Link trades using the form below.
                        </div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-surface2 border-b border-default">
                              {['Date', 'Ticker', 'Strategy', 'Open', 'Close', 'Qty', 'P&L', 'Status'].map(h => (
                                <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase ${h === 'Open' || h === 'Close' || h === 'Qty' || h === 'P&L' ? 'text-right' : h === 'Status' ? 'text-center' : 'text-left'}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {legs.map((leg, li) => {
                              const legPnl = leg.pnl ?? 0
                              const legOpen = leg.exit_price === null
                              const legPnlColor = legPnl > 0 ? 'text-gain' : legPnl < 0 ? 'text-loss' : 'text-text-muted'
                              return (
                                <tr key={leg.id} className={`border-b border-default last:border-0 ${li % 2 === 0 ? 'bg-surface' : 'bg-bg'}`}>
                                  <td className="px-4 py-2.5 font-mono text-text-secondary">{leg.date}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1.5">
                                      <TickerLogo ticker={leg.ticker} size={14} />
                                      <span className="text-text-primary font-bold tracking-wider">{leg.ticker}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                                      leg.asset_type === 'option'
                                        ? 'border-amber-400/30 text-amber-400 bg-amber-400/10'
                                        : 'border-default text-text-secondary bg-surface2'
                                    }`}>
                                      {STRATEGY_SHORT[leg.strategy] ?? leg.strategy}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono text-text-primary">${leg.entry_price?.toFixed(2)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                                    {leg.exit_price != null ? `$${leg.exit_price.toFixed(2)}` : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">{leg.quantity}</td>
                                  <td className={`px-4 py-2.5 text-right font-mono font-bold ${legPnlColor}`}>
                                    {legOpen ? '—' : legPnl !== 0 ? `${legPnl > 0 ? '+' : ''}$${Math.abs(legPnl).toFixed(2)}` : '$0.00'}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                      legOpen ? 'bg-amber-400/10 text-amber-400' : 'bg-gain/10 text-gain'
                                    }`}>
                                      {legOpen ? 'OPEN' : 'CLOSED'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {trades.length === 0 ? (
        <div className="border border-default bg-surface p-12 text-center rounded-xl">
          <div className="text-text-muted text-sm mb-2">No trades logged yet.</div>
          <div className="text-text-muted text-xs">Click &quot;Add Trade&quot; to get started.</div>
        </div>
      ) : (
        <div className="border border-default rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-default bg-surface2">
                <th
                  className={`px-4 py-3 text-left text-[10px] font-semibold tracking-[0.14em] uppercase cursor-pointer hover:text-text-primary select-none ${sortKey === 'date' ? 'text-accent' : 'text-text-muted'}`}
                  onClick={() => toggleSort('date')}
                >
                  Date {sortKey === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  className={`px-4 py-3 text-left text-[10px] font-semibold tracking-[0.14em] uppercase cursor-pointer hover:text-text-primary select-none ${sortKey === 'ticker' ? 'text-accent' : 'text-text-muted'}`}
                  onClick={() => toggleSort('ticker')}
                >
                  Ticker {sortKey === 'ticker' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Strategy</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Open</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Close</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Qty</th>
                <th
                  className={`px-4 py-3 text-right text-[10px] font-semibold tracking-[0.14em] uppercase cursor-pointer hover:text-text-primary select-none ${sortKey === 'pnl' ? 'text-accent' : 'text-text-muted'}`}
                  onClick={() => toggleSort('pnl')}
                >
                  P&L {sortKey === 'pnl' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Return</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">DTE</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Note</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((trade, i) => {
                const pnl = trade.pnl ?? 0
                const pnlColor = pnl > 0 ? 'text-gain' : pnl < 0 ? 'text-loss' : 'text-text-muted'
                const isOpen = trade.exit_price == null
                const roc = trade.strategy === 'csp' && trade.strike != null
                  ? ((trade.entry_price / trade.strike) * 100).toFixed(2)
                  : null
                return (
                  <tr
                    key={trade.id}
                    className={`border-b border-default hover:bg-surface2 transition-colors ${i % 2 === 0 ? 'bg-surface' : 'bg-bg'}`}
                  >
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{trade.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TickerLogo ticker={trade.ticker} size={18} />
                        <div>
                          <div className="text-text-primary font-bold tracking-wider text-xs">{trade.ticker}</div>
                          <div className={`text-[10px] font-semibold tracking-[0.1em] uppercase ${isOpen ? 'text-amber' : 'text-text-muted'}`}>
                            {isOpen ? 'Open' : 'Closed'}
                          </div>
                          {trade.group_id && (() => {
                            const g = tradeGroups.find(g => g.id === trade.group_id)
                            return g ? (
                              <div
                                className="text-[9px] font-semibold text-accent/80 bg-accent/10 border border-accent/20 rounded-full px-1.5 py-0.5 mt-0.5 truncate max-w-[80px]"
                                title={g.label}
                              >
                                {g.label.length > 10 ? g.label.slice(0, 10) + '…' : g.label}
                              </div>
                            ) : null
                          })()}
                          {(trade.mistake_tags ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {(trade.mistake_tags ?? []).map(tag => (
                                <span key={tag} className="text-[9px] font-semibold text-amber/80 bg-amber/10 border border-amber/20 rounded-full px-1.5 py-0.5">
                                  {MISTAKE_LABEL[tag] ?? tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border tracking-wide whitespace-nowrap ${
                        trade.asset_type === 'option'
                          ? 'border-amber/30 text-amber bg-amber/10'
                          : 'border-border text-text-secondary bg-surface2'
                      }`}>
                        {STRATEGY_SHORT[trade.strategy] ?? trade.strategy}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary font-mono text-xs">${trade.entry_price?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {trade.exit_price != null ? (
                        <span className="text-text-secondary">${trade.exit_price.toFixed(2)}</span>
                      ) : livePrices[trade.ticker] != null ? (
                        <span className="text-text-muted/70 flex items-center justify-end gap-1">
                          <span className="w-1 h-1 rounded-full bg-gain animate-pulse flex-shrink-0 inline-block" />
                          ${livePrices[trade.ticker].toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary font-mono text-xs">{trade.quantity}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold text-sm ${pnlColor}`}>
                      {pnl !== 0 ? `${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)}` :
                        (isOpen && trade.asset_type !== 'option' && livePrices[trade.ticker] != null) ? (() => {
                          const unrealized = (livePrices[trade.ticker] - trade.entry_price) * (trade.quantity ?? 1)
                          return <span className={unrealized >= 0 ? 'text-gain' : 'text-loss'}>~{unrealized >= 0 ? '+$' : '-$'}{Math.abs(unrealized).toFixed(2)}</span>
                        })() : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-xs ${pnlColor}`}>
                      <div>{trade.pnl_pct != null ? `${trade.pnl_pct > 0 ? '+' : ''}${trade.pnl_pct.toFixed(2)}%` : '—'}</div>
                      {roc && <div className="text-text-muted text-[10px] mt-0.5">ROC {roc}%</div>}
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted font-mono text-xs">
                      {trade.dte != null ? trade.dte : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[100px]">
                      {trade.notes ? (
                        <span
                          title={trade.notes}
                          className="text-[10px] text-text-muted/70 leading-snug line-clamp-2 cursor-default block"
                        >
                          {trade.notes.length > 28 ? trade.notes.slice(0, 28) + '…' : trade.notes}
                        </span>
                      ) : (
                        <span className="text-text-muted/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEdit(trade)}
                          className="text-[10px] font-semibold tracking-[0.1em] uppercase text-text-muted hover:text-accent transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(trade.id)}
                          className="text-[10px] font-semibold tracking-[0.1em] uppercase text-text-muted hover:text-loss transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingTrade ? 'Edit Trade' : isMultiLegMode ? 'Log Spread' : 'Add Trade'}
        width="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Row 1: Date, Ticker */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ticker</label>
              <input
                type="text"
                value={form.ticker}
                onChange={e => setForm(p => ({ ...p, ticker: e.target.value.toUpperCase() }))}
                required
                placeholder="AAPL"
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 2: Asset Type, Strategy */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Asset Type</label>
              <select
                value={form.asset_type}
                onChange={e => handleAssetTypeChange(e.target.value as AssetType)}
                className={inputClass}
              >
                <option value="equity">Equity</option>
                <option value="option">Option</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Strategy</label>
              <select
                value={form.strategy}
                onChange={e => handleStrategyChange(e.target.value)}
                className={inputClass}
              >
                {strategyOptions.map(s => (
                  <option key={s} value={s}>{STRATEGY_LABELS[s] ?? s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-leg form */}
          {isMultiLegMode && (
            <>
              <div>
                <label className={labelClass}>Spread Label</label>
                <input
                  type="text"
                  value={form.group_new_label}
                  onChange={e => setForm(p => ({ ...p, group_new_label: e.target.value }))}
                  placeholder={`${form.ticker || 'TICKER'} ${STRATEGY_LABELS[form.strategy] ?? form.strategy} ${form.date}`}
                  className={inputClass}
                  maxLength={80}
                />
              </div>
              <div className="space-y-3">
                {form.legs.map((leg, i) => {
                  const legDef = STRATEGY_LEGS[form.strategy]![i]
                  const { pnl: legPnl } = computeLegPnl(leg, legDef.direction)
                  return (
                    <div key={i} className="border border-default/50 rounded-xl p-4 bg-bg">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-semibold text-text-muted tracking-widest uppercase">Leg {i + 1}</span>
                        <span className="text-sm font-semibold text-text-primary">{legDef.label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${legDef.direction === 'credit' ? 'text-gain border-gain/30 bg-gain/10' : 'text-accent border-accent/30 bg-accent/10'}`}>
                          {legDef.direction === 'credit' ? 'Sell' : 'Buy'}
                        </span>
                        {legPnl !== null && (
                          <span className={`ml-auto text-xs font-mono font-bold ${legPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                            {legPnl >= 0 ? '+' : ''}${Math.abs(legPnl).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className={labelClass}>Strike</label>
                          <input type="number" step="0.50" value={leg.strike} onChange={e => updateLeg(i, 'strike', e.target.value)} placeholder="0.00" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Expiration</label>
                          <input type="date" value={leg.expiration} onChange={e => updateLeg(i, 'expiration', e.target.value)} className={inputClass} />
                          {leg.expiration && (
                            <div className="mt-1">
                              <span className="text-[10px] border border-accent/40 text-accent px-2 py-0.5 rounded-full">
                                {calcDTEFromExpiration(leg.expiration)} DTE
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>Qty</label>
                          <input type="number" step="1" value={leg.quantity} onChange={e => updateLeg(i, 'quantity', e.target.value)} placeholder="1" className={inputClass} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Open</label>
                          <input type="number" step="0.01" value={leg.entry_price} onChange={e => updateLeg(i, 'entry_price', e.target.value)} placeholder="0.00" required className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Close</label>
                          <input type="number" step="0.01" value={leg.exit_price} onChange={e => updateLeg(i, 'exit_price', e.target.value)} placeholder="0.00" className={inputClass} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Single-leg: Entry, Exit, Quantity */}
          {!isMultiLegMode && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Open</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.entry_price}
                  onChange={e => setForm(p => ({ ...p, entry_price: e.target.value }))}
                  required
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Close</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.exit_price}
                  onChange={e => setForm(p => ({ ...p, exit_price: e.target.value }))}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Quantity</label>
                <input
                  type="number"
                  step="1"
                  value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="1"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Single-leg: P&L (auto-calculated, read-only) */}
          {!isMultiLegMode && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  P&L ($)
                  <span className="ml-2 text-text-muted normal-case tracking-normal">auto</span>
                </label>
                <input type="text" value={form.pnl} readOnly placeholder="—" className={readonlyInputClass} />
              </div>
              <div>
                <label className={labelClass}>
                  P&L (%)
                  <span className="ml-2 text-text-muted normal-case tracking-normal">auto</span>
                </label>
                <input type="text" value={form.pnl_pct} readOnly placeholder="—" className={readonlyInputClass} />
              </div>
            </div>
          )}

          {/* Option details (single-leg only) */}
          {!isMultiLegMode && form.asset_type === 'option' && (
            <div className="border border-default/50 p-4 bg-bg rounded-xl">
              <div className="text-xs text-text-muted tracking-widest uppercase mb-3">Option Details</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Strike</label>
                  <input
                    type="number"
                    step="0.50"
                    value={form.strike}
                    onChange={e => setForm(p => ({ ...p, strike: e.target.value }))}
                    placeholder="0.00"
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
                  {form.expiration && (
                    <div className="mt-1.5">
                      <span className="text-xs border border-accent/40 text-accent px-2.5 py-0.5 rounded-full">
                        {calcDTEFromExpiration(form.expiration)} DTE
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder="Trade rationale, setups, lessons..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Link to Spread (single-leg only) */}
          {!isMultiLegMode && (
            <div className="border border-default/50 p-4 bg-bg rounded-xl">
              <div className="text-xs text-text-muted tracking-widest uppercase mb-3">Link to Spread (optional)</div>
              <div className="flex gap-2 mb-3">
                {(
                  [
                    { value: 'standalone', label: 'Standalone' },
                    { value: 'new',        label: 'New Spread' },
                    { value: 'existing',   label: 'Add to Existing' },
                  ] as const
                ).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({
                      ...p,
                      group_mode: opt.value,
                      group_new_label: opt.value !== 'new' ? '' : p.group_new_label,
                      group_existing_id: opt.value !== 'existing' ? '' : p.group_existing_id,
                    }))}
                    className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-all ${
                      form.group_mode === opt.value
                        ? 'border-accent text-accent bg-accent/10'
                        : 'border-default text-text-muted hover:text-text-primary bg-bg'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {form.group_mode === 'new' && (
                <div>
                  <label className={labelClass}>Spread Label</label>
                  <input
                    type="text"
                    value={form.group_new_label}
                    onChange={e => setForm(p => ({ ...p, group_new_label: e.target.value }))}
                    placeholder="e.g. AAPL Bull Put 490/495 May"
                    className={inputClass}
                    maxLength={80}
                  />
                </div>
              )}
              {form.group_mode === 'existing' && (
                <div>
                  <label className={labelClass}>Select Spread</label>
                  {tradeGroups.length === 0 ? (
                    <p className="text-xs text-text-muted italic">No spreads yet. Use &quot;New Spread&quot; to create one first.</p>
                  ) : (
                    <select
                      value={form.group_existing_id}
                      onChange={e => setForm(p => ({ ...p, group_existing_id: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">— Select a spread —</option>
                      {tradeGroups.map(g => {
                        const legCount = tradesByGroup[g.id]?.length ?? 0
                        return (
                          <option key={g.id} value={g.id}>
                            {g.label} ({legCount} leg{legCount !== 1 ? 's' : ''})
                          </option>
                        )
                      })}
                    </select>
                  )}
                </div>
              )}
              {form.group_mode === 'standalone' && (
                <p className="text-[11px] text-text-muted">This trade will be logged independently. You can group it later by editing.</p>
              )}
            </div>
          )}

          {/* Mistake tags */}
          <div>
            <label className={labelClass}>Mistakes Tagged</label>
            <div className="flex flex-wrap gap-2">
              {MISTAKE_TAGS.map(tag => {
                const selected = form.mistake_tags.includes(tag.value)
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => setForm(p => ({
                      ...p,
                      mistake_tags: selected
                        ? p.mistake_tags.filter(v => v !== tag.value)
                        : [...p.mistake_tags, tag.value],
                    }))}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      selected ? tag.cls : 'text-text-muted border-default/50 bg-bg hover:bg-surface2'
                    }`}
                  >
                    {tag.label}
                  </button>
                )
              })}
            </div>
          </div>

          {formError && (
            <div className="text-loss text-sm bg-loss/10 border border-loss/20 px-3 py-2 rounded-lg">
              {formError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editingTrade ? 'Update Trade' : isMultiLegMode ? 'Log All Legs' : 'Add Trade'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
