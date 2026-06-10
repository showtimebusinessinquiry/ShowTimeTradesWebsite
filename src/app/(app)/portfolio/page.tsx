'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { PortfolioPosition, InsertPortfolioPosition, UpdatePortfolioPosition, AssetType, Trade, InsertTrade } from '@/types/database'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { TickerLogo } from '@/components/ui/TickerLogo'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  calcUnrealizedPnl,
  calcUnrealizedPnlPct,
  calcCostBasis,
  calcCurrentValue,
  calcAllocationPct,
} from '@/utils/calculations'

// ─── Ticker allocation chart ─────────────────────────────────────────────────

const TICKER_COLORS = [
  '#ff4444', '#00e676', '#3b82f6', '#f5a623', '#a78bfa',
  '#34d399', '#f87171', '#60a5fa', '#fbbf24', '#818cf8',
  '#fb7185', '#2dd4bf', '#c084fc', '#facc15', '#38bdf8',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DoughnutTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-surface2 border border-default rounded-lg px-3 py-2 shadow-lg">
      <div className="text-sm font-bold text-text-primary mb-0.5">{d.name}</div>
      <div className="text-xs font-mono text-text-secondary">
        ${d.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface PositionFormValues {
  ticker: string
  asset_type: AssetType
  entry_price: string
  quantity: string
  notes: string
}

const defaultForm = (): PositionFormValues => ({
  ticker: '',
  asset_type: 'equity',
  entry_price: '',
  quantity: '',
  notes: '',
})

// ─── Page ─────────────────────────────────────────────────────────────────────

type SortKey = 'ticker' | 'asset_type' | 'entry_price' | 'current_price' | 'quantity' | 'cost_basis' | 'value' | 'unrealized_pnl' | 'unrealized_pct' | 'alloc_pct'

export default function PortfolioPage() {
  const { user } = useAuth()
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [closedTrades, setClosedTrades] = useState<Trade[]>([])
  const [totalRealizedPnl, setTotalRealizedPnl] = useState(0)
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const [pricesLoading, setPricesLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [cashModalOpen, setCashModalOpen] = useState(false)
  const [cashAmount, setCashAmount] = useState('')
  const [editingPosition, setEditingPosition] = useState<PortfolioPosition | null>(null)
  const [form, setForm] = useState<PositionFormValues>(defaultForm())
  const [autoPrice, setAutoPrice] = useState<number | null>(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [closingPosition, setClosingPosition] = useState<PortfolioPosition | null>(null)
  const [closeForm, setCloseForm] = useState({ exit_price: '', date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [snapshots, setSnapshots] = useState<Array<{ snapshot_date: string; total_market_value: number | null; total_cost_basis: number | null; unrealized_pnl: number | null; position_count: number | null }>>([])
  const [showHistory, setShowHistory] = useState(false)

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const loadSnapshots = async () => {
    if (!user) return
    const { data } = await supabase
      .from('portfolio_snapshots')
      .select('snapshot_date, total_market_value, total_cost_basis, unrealized_pnl, position_count')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(90)
    setSnapshots(data ?? [])
  }

  const fetchLivePrices = async (pos: PortfolioPosition[]): Promise<Record<string, number>> => {
    const symbols = Array.from(new Set(pos.map(p => p.ticker).filter(t => t !== 'CASH')))
    if (symbols.length === 0) return {}
    setPricesLoading(true)
    try {
      const res = await fetch(`/api/stock-quotes?symbols=${symbols.join(',')}`)
      const data: { quotes: Array<{ symbol: string; price: number; change: number; changePct: number }> } = await res.json()
      const map: Record<string, number> = {}
      data.quotes.forEach(q => { map[q.symbol] = q.price })
      setLivePrices(map)
      setPricesLoading(false)
      return map
    } catch (err) {
      console.error('Failed to fetch live prices:', err)
    }
    setPricesLoading(false)
    return {}
  }

  const fetchPositions = async () => {
    if (!user) {
      setLoading(false)
      return
    }
    const [posRes, closedRes, pnlRes] = await Promise.all([
      supabase.from('portfolio_positions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('trades').select('*').eq('user_id', user.id).eq('strategy', 'portfolio_close').order('date', { ascending: false }),
      supabase.from('trades').select('pnl').eq('user_id', user.id).not('pnl', 'is', null),
    ])
    const pos = (posRes.data ?? []) as PortfolioPosition[]
    setPositions(pos)
    setClosedTrades((closedRes.data ?? []) as Trade[])
    setTotalRealizedPnl((pnlRes.data ?? []).reduce((s, t) => s + (t.pnl ?? 0), 0))
    setLoading(false)
    const priceMap = await fetchLivePrices(pos)

    // Save daily snapshot
    if (user && pos.length > 0) {
      const equityPos = pos.filter(p => p.ticker !== 'CASH')
      const total_cost_basis = equityPos.reduce((s, p) => s + p.entry_price * p.quantity, 0)
      const total_market_value = equityPos.reduce((s, p) => s + (priceMap[p.ticker] ?? p.entry_price) * p.quantity, 0)
      const unrealized_pnl = total_market_value - total_cost_basis
      const today = new Date().toISOString().slice(0, 10)
      ;(async () => {
        const { error } = await supabase.from('portfolio_snapshots').upsert({
          user_id: user.id,
          snapshot_date: today,
          total_market_value: parseFloat(total_market_value.toFixed(4)),
          total_cost_basis: parseFloat(total_cost_basis.toFixed(4)),
          unrealized_pnl: parseFloat(unrealized_pnl.toFixed(4)),
          position_count: equityPos.length,
        }, { onConflict: 'user_id,snapshot_date' })
        if (error) { console.error('[Portfolio] snapshot upsert error:', error); return }
        await loadSnapshots()
      })()
    }
  }

  useEffect(() => {
    fetchPositions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Auto-fetch live price when ticker field loses focus
  const handleTickerBlur = async () => {
    const ticker = form.ticker.trim().toUpperCase()
    if (!ticker || ticker === 'CASH' || form.asset_type === 'option') return
    setFetchingPrice(true)
    setAutoPrice(null)
    try {
      const res = await fetch(`/api/price-quote?symbols=${ticker}`)
      const data: { quotes: { symbol: string; price: number }[] } = await res.json()
      const found = data.quotes.find(q => q.symbol === ticker)
      if (found) setAutoPrice(found.price)
    } catch { /* ignore */ }
    setFetchingPrice(false)
  }

  const openAdd = () => {
    setEditingPosition(null)
    setForm(defaultForm())
    setAutoPrice(null)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (position: PortfolioPosition) => {
    setEditingPosition(position)
    setForm({
      ticker: position.ticker,
      asset_type: position.asset_type,
      entry_price: position.entry_price?.toString() ?? '',
      quantity: position.quantity?.toString() ?? '',
      notes: position.notes ?? '',
    })
    setAutoPrice(livePrices[position.ticker] ?? null)
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingPosition(null)
    setAutoPrice(null)
    setFormError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.ticker.trim()) { setFormError('Ticker is required.'); return }
    if (!form.entry_price || isNaN(Number(form.entry_price))) { setFormError('Entry price must be a valid number.'); return }
    if (!form.quantity || isNaN(Number(form.quantity))) { setFormError('Quantity must be a valid number.'); return }
    setSaving(true)

    const payload = {
      ticker: form.ticker.trim().toUpperCase(),
      asset_type: form.asset_type,
      entry_price: parseFloat(form.entry_price),
      current_price: autoPrice,
      quantity: parseFloat(form.quantity),
      notes: form.notes.trim() || null,
    }

    if (editingPosition) {
      const updatePayload: UpdatePortfolioPosition = { ...payload, updated_at: new Date().toISOString() }
      const { error } = await supabase.from('portfolio_positions').update(updatePayload).eq('id', editingPosition.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      if (!user) { setFormError('Session expired. Please sign in again.'); setSaving(false); return }
      const insertPayload: InsertPortfolioPosition = { ...payload, user_id: user.id }
      const { error } = await supabase.from('portfolio_positions').insert(insertPayload)
      if (error) { setFormError(error.message); setSaving(false); return }
    }
    const isEditing = !!editingPosition
    setSaving(false)
    closeModal()
    notify(isEditing ? 'Position updated.' : 'Position added.')
    await fetchPositions()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this position?')) return
    const { error } = await supabase.from('portfolio_positions').delete().eq('id', id)
    if (error) { notify(`Delete failed: ${error.message}`, false); return }
    await fetchPositions()
  }

  const openCloseModal = (position: PortfolioPosition) => {
    setClosingPosition(position)
    setCloseForm({
      exit_price: livePrices[position.ticker] != null ? livePrices[position.ticker].toFixed(2) : '',
      date: new Date().toISOString().slice(0, 10),
    })
    setFormError(null)
    setCloseModalOpen(true)
  }

  const handleClosePosition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!closingPosition) return
    const exitPrice = parseFloat(closeForm.exit_price)
    if (isNaN(exitPrice) || exitPrice < 0) { setFormError('Enter a valid exit price.'); return }
    if (!user) { setFormError('Session expired. Please sign in again.'); return }
    setSaving(true)
    const { entry_price: entry, quantity: qty, ticker, asset_type, notes } = closingPosition
    const multiplier = asset_type === 'option' ? 100 : 1
    const pnl = parseFloat(((exitPrice - entry) * qty * multiplier).toFixed(2))
    const pnl_pct = entry > 0 ? parseFloat(((exitPrice - entry) / entry * 100).toFixed(2)) : 0
    const tradePayload: InsertTrade = {
      user_id: user.id,
      date: closeForm.date,
      ticker,
      asset_type,
      strategy: 'portfolio_close',
      entry_price: entry,
      exit_price: exitPrice,
      quantity: qty,
      pnl,
      pnl_pct,
      notes: notes ?? null,
    }
    const [tradeRes, delRes] = await Promise.all([
      supabase.from('trades').insert(tradePayload),
      supabase.from('portfolio_positions').delete().eq('id', closingPosition.id),
    ])
    if (tradeRes.error) { setFormError(tradeRes.error.message); setSaving(false); return }
    if (delRes.error) { setFormError(delRes.error.message); setSaving(false); return }
    setSaving(false)
    setCloseModalOpen(false)
    setClosingPosition(null)
    notify('Position closed.')
    await fetchPositions()
  }

  const handleAddCash = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(cashAmount)
    if (isNaN(amount) || amount <= 0) { setFormError('Enter a valid cash amount.'); return }
    if (!user) { setFormError('Session expired. Please sign in again.'); return }
    setSaving(true)
    const existingCash = positions.find(p => p.ticker === 'CASH')
    if (existingCash) {
      const { error } = await supabase.from('portfolio_positions')
        .update({ quantity: amount, updated_at: new Date().toISOString() })
        .eq('id', existingCash.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('portfolio_positions').insert({
        user_id: user.id, ticker: 'CASH', asset_type: 'equity',
        entry_price: 1, current_price: 1, quantity: amount, notes: 'Cash balance',
      })
      if (error) { setFormError(error.message); setSaving(false); return }
    }
    setSaving(false)
    setCashModalOpen(false)
    setCashAmount('')
    setFormError(null)
    notify('Cash balance updated.')
    await fetchPositions()
  }

  // Totals — use live price vs entry price; never fall back to stored current_price
  const totalCost = positions.reduce((sum, p) => sum + calcCostBasis(p.entry_price, p.quantity), 0)
  const totalValue = positions.reduce((sum, p) => {
    const cur = p.ticker === 'CASH' ? 1 : (livePrices[p.ticker] ?? p.entry_price)
    return sum + calcCurrentValue(cur, p.quantity)
  }, 0)
  const totalUnrealizedPnl = totalValue - totalCost

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedPositions = useMemo(() => {
    if (!sortKey) return positions
    return [...positions].sort((a, b) => {
      let aVal: number | string = 0
      let bVal: number | string = 0
      const aLive = a.ticker === 'CASH' ? 1 : (livePrices[a.ticker] ?? a.entry_price)
      const bLive = b.ticker === 'CASH' ? 1 : (livePrices[b.ticker] ?? b.entry_price)
      switch (sortKey) {
        case 'ticker': aVal = a.ticker; bVal = b.ticker; break
        case 'asset_type': aVal = a.asset_type; bVal = b.asset_type; break
        case 'entry_price': aVal = a.entry_price; bVal = b.entry_price; break
        case 'current_price': aVal = aLive; bVal = bLive; break
        case 'quantity': aVal = a.quantity; bVal = b.quantity; break
        case 'cost_basis': aVal = calcCostBasis(a.entry_price, a.quantity); bVal = calcCostBasis(b.entry_price, b.quantity); break
        case 'value': aVal = calcCurrentValue(aLive, a.quantity); bVal = calcCurrentValue(bLive, b.quantity); break
        case 'unrealized_pnl':
          aVal = a.ticker === 'CASH' ? 0 : calcUnrealizedPnl(a.entry_price, aLive, a.quantity)
          bVal = b.ticker === 'CASH' ? 0 : calcUnrealizedPnl(b.entry_price, bLive, b.quantity)
          break
        case 'unrealized_pct':
          aVal = a.ticker === 'CASH' ? 0 : calcUnrealizedPnlPct(a.entry_price, aLive)
          bVal = b.ticker === 'CASH' ? 0 : calcUnrealizedPnlPct(b.entry_price, bLive)
          break
        case 'alloc_pct':
          aVal = calcAllocationPct(calcCurrentValue(aLive, a.quantity), totalValue)
          bVal = calcAllocationPct(calcCurrentValue(bLive, b.quantity), totalValue)
          break
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
  }, [positions, sortKey, sortDir, livePrices, totalValue])

  const tickerAllocationData = useMemo(() => {
    const cashPos = positions.find(p => p.ticker === 'CASH')
    const items = positions
      .filter(p => p.ticker !== 'CASH')
      .map((p, i) => ({
        name: p.ticker,
        value: parseFloat(((livePrices[p.ticker] ?? p.entry_price) * p.quantity).toFixed(2)),
        color: TICKER_COLORS[i % TICKER_COLORS.length],
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
    if (cashPos && cashPos.quantity > 0) {
      items.push({ name: 'CASH', value: parseFloat(cashPos.quantity.toFixed(2)), color: '#4a5568' })
    }
    return items
  }, [positions, livePrices])

  const inputClass = "w-full bg-bg border border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
  const labelClass = "block text-xs text-text-muted tracking-wide uppercase mb-1.5"

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        <div className="text-text-muted text-sm animate-pulse">Loading portfolio…</div>
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
        title="Portfolio"
        subtitle={`${positions.length} positions`}
        action={
          <div className="flex gap-2 items-center">
            {pricesLoading && <span className="text-xs text-text-muted animate-pulse">Fetching prices...</span>}
            <Button onClick={fetchPositions} variant="secondary" disabled={pricesLoading}>↻ Refresh</Button>
            <Button
              onClick={() => { setCashAmount(positions.find(p => p.ticker === 'CASH')?.quantity.toString() ?? ''); setFormError(null); setCashModalOpen(true) }}
              variant="secondary"
            >
              Add Cash
            </Button>
            <Button onClick={openAdd} variant="primary">+ Add Position</Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Value" value={`$${totalValue.toFixed(2)}`} variant="white" size="lg" />
        <MetricCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} variant="default" />
        <MetricCard
          label="Unrealized P&L"
          value={`${totalUnrealizedPnl >= 0 ? '+' : ''}$${totalUnrealizedPnl.toFixed(2)}`}
          variant={totalUnrealizedPnl >= 0 ? 'gain' : 'loss'}
          sub={totalCost > 0 ? `${((totalUnrealizedPnl / totalCost) * 100).toFixed(2)}%` : undefined}
        />
        <MetricCard
          label="Realized P&L"
          value={`${totalRealizedPnl >= 0 ? '+' : ''}$${totalRealizedPnl.toFixed(2)}`}
          variant={totalRealizedPnl >= 0 ? 'gain' : totalRealizedPnl < 0 ? 'loss' : 'default'}
          sub="all closed trades"
        />
      </div>

      {/* Allocation doughnut by ticker */}
      {tickerAllocationData.length > 0 && (
        <div className="bg-surface border border-default rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-0.5 h-3.5 rounded-full bg-accent/50 inline-block" />
            <span className="text-[11px] font-semibold text-text-secondary tracking-[0.1em] uppercase">Allocation</span>
          </div>
          <div className="flex items-center gap-8 flex-wrap">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={tickerAllocationData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={2} dataKey="value">
                  {tickerAllocationData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DoughnutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              {tickerAllocationData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-xs font-bold text-text-secondary w-12">{d.name}</span>
                  <span className="text-xs font-mono text-text-primary">
                    {totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {positions.length === 0 ? (
        <div className="border border-default bg-surface p-12 text-center rounded-xl">
          <div className="text-text-muted text-sm mb-2">No positions yet.</div>
          <div className="text-text-muted text-xs">Click &quot;Add Position&quot; to track your holdings.</div>
        </div>
      ) : (
        <div className="border border-default rounded-xl overflow-hidden overflow-x-auto">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-default bg-surface2">
            <span className="w-0.5 h-3.5 rounded-full bg-accent/50 inline-block" />
            <span className="text-[11px] font-semibold text-text-secondary tracking-[0.1em] uppercase">Open Positions</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-default bg-surface2">
                {([
                  ['ticker', 'Ticker', 'left'],
                  ['asset_type', 'Type', 'left'],
                  ['entry_price', 'Entry', 'right'],
                  ['current_price', 'Current', 'right'],
                  ['quantity', 'Qty', 'right'],
                  ['cost_basis', 'Cost Basis', 'right'],
                  ['value', 'Value', 'right'],
                  ['unrealized_pnl', 'Unreal. P&L', 'right'],
                  ['unrealized_pct', 'P&L %', 'right'],
                  ['alloc_pct', 'Alloc %', 'right'],
                ] as [SortKey, string, string][]).map(([key, label, align]) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`px-4 py-3 text-${align} text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase cursor-pointer select-none hover:text-text-primary transition-colors`}
                  >
                    {label}
                    <span className="ml-1 opacity-40">
                      {sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Actions</th>
              </tr>
            </thead>
              <tbody>
                {sortedPositions.map((pos, i) => {
                  const livePrice = livePrices[pos.ticker]
                  const isCash = pos.ticker === 'CASH'
                  const currentPrice = isCash ? 1 : (livePrice ?? pos.entry_price)
                  const costBasis = calcCostBasis(pos.entry_price, pos.quantity)
                  const value = calcCurrentValue(currentPrice, pos.quantity)
                  const unrealizedPnl = isCash ? null : (livePrice != null ? calcUnrealizedPnl(pos.entry_price, livePrice, pos.quantity) : null)
                  const unrealizedPct = isCash ? null : (livePrice != null ? calcUnrealizedPnlPct(pos.entry_price, livePrice) : null)
                  const allocPct = calcAllocationPct(value, totalValue)
                  const pnlColor = unrealizedPnl != null && unrealizedPnl > 0 ? 'text-gain' : unrealizedPnl != null && unrealizedPnl < 0 ? 'text-loss' : 'text-text-muted'

                  return (
                    <tr key={pos.id} className={`border-b border-default hover:bg-surface2 transition-colors ${i % 2 === 0 ? 'bg-surface' : 'bg-bg'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TickerLogo ticker={pos.ticker} size={18} />
                          <span className="text-text-primary font-bold tracking-wider">{pos.ticker}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary capitalize">{pos.asset_type}</td>
                      <td className="px-4 py-3 text-right text-text-secondary font-mono">${pos.entry_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {isCash ? (
                          <span className="text-text-muted">—</span>
                        ) : livePrice != null ? (
                          <span className="text-text-primary font-semibold">${livePrice.toFixed(2)}</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary font-mono">{pos.quantity}</td>
                      <td className="px-4 py-3 text-right text-text-secondary font-mono">${costBasis.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-text-primary font-mono font-semibold">${value.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold text-sm ${isCash ? 'text-text-muted' : pnlColor}`}>
                        {isCash || unrealizedPnl == null ? '—' : `${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toFixed(2)}`}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${isCash ? 'text-text-muted' : pnlColor}`}>
                        {isCash || unrealizedPct == null ? '—' : `${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(2)}%`}
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted font-mono">{allocPct.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => openEdit(pos)} className="text-[10px] font-semibold tracking-[0.1em] uppercase text-text-muted hover:text-accent transition-colors">Edit</button>
                          {!isCash && (
                            <button onClick={() => openCloseModal(pos)} className="text-[10px] font-semibold tracking-[0.1em] uppercase text-text-muted hover:text-amber transition-colors">Close</button>
                          )}
                          <button onClick={() => handleDelete(pos.id)} className="text-[10px] font-semibold tracking-[0.1em] uppercase text-text-muted hover:text-loss transition-colors">Delete</button>
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
      <Modal open={modalOpen} onClose={closeModal} title={editingPosition ? 'Edit Position' : 'Add Position'} width="max-w-lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ticker</label>
              <input
                type="text"
                value={form.ticker}
                onChange={e => { setForm(p => ({ ...p, ticker: e.target.value.toUpperCase() })); setAutoPrice(null) }}
                onBlur={handleTickerBlur}
                required
                placeholder="AAPL"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Asset Type</label>
              <select
                value={form.asset_type}
                onChange={e => setForm(p => ({ ...p, asset_type: e.target.value as AssetType }))}
                className={inputClass}
              >
                <option value="equity">Equity</option>
                <option value="option">Option</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Entry Price</label>
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
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                required
                placeholder="1"
                className={inputClass}
              />
            </div>
          </div>

          {/* Live price auto-fetch display */}
          {form.ticker.length > 0 && form.asset_type === 'equity' && (
            <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${
              fetchingPrice
                ? 'bg-surface2 border-default text-text-muted'
                : autoPrice != null
                  ? 'bg-gain/10 border-gain/30 text-gain'
                  : 'bg-surface2 border-default text-text-muted'
            }`}>
              {fetchingPrice ? (
                <span className="animate-pulse">Fetching {form.ticker} price...</span>
              ) : autoPrice != null ? (
                <>
                  <span className="font-bold">{form.ticker}</span>
                  <span className="font-mono font-semibold">${autoPrice.toFixed(2)}</span>
                  <span className="opacity-60">· live price</span>
                </>
              ) : (
                <span>Tab away from ticker to auto-fetch price</span>
              )}
            </div>
          )}

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder="Position notes..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {formError && (
            <div className="text-loss text-sm bg-loss/10 border border-loss/20 px-3 py-2 rounded-lg">{formError}</div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editingPosition ? 'Update Position' : 'Add Position'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Add Cash Modal */}
      <Modal open={cashModalOpen} onClose={() => { setCashModalOpen(false); setFormError(null) }} title="Cash Balance" width="max-w-sm">
        <form onSubmit={handleAddCash} className="space-y-4">
          <div className="text-xs text-text-muted bg-surface2 rounded-lg px-3 py-2">
            Sets your cash balance as a portfolio position. Replaces any existing cash entry.
          </div>
          <div>
            <label className={labelClass}>Cash Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cashAmount}
              onChange={e => setCashAmount(e.target.value)}
              placeholder="10000.00"
              className={inputClass}
              autoFocus
            />
          </div>
          {formError && (
            <div className="text-loss text-xs bg-loss/10 border border-loss/30 rounded-lg px-3 py-2">{formError}</div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Set Cash Balance'}</Button>
            <Button type="button" variant="secondary" onClick={() => { setCashModalOpen(false); setFormError(null) }}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Close Position Modal */}
      <Modal open={closeModalOpen} onClose={() => { setCloseModalOpen(false); setClosingPosition(null); setFormError(null) }} title="Close Position" width="max-w-sm">
        <form onSubmit={handleClosePosition} className="space-y-4">
          {closingPosition && (
            <div className="bg-surface2 rounded-lg px-3 py-2.5 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Ticker</span>
                <span className="font-bold text-text-primary">{closingPosition.ticker}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Entry</span>
                <span className="font-mono text-text-primary">${closingPosition.entry_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Qty</span>
                <span className="font-mono text-text-primary">{closingPosition.quantity}</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Close Date</label>
              <input
                type="date"
                value={closeForm.date}
                onChange={e => setCloseForm(f => ({ ...f, date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Exit Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={closeForm.exit_price}
                onChange={e => setCloseForm(f => ({ ...f, exit_price: e.target.value }))}
                placeholder="0.00"
                className={inputClass}
                autoFocus
              />
            </div>
          </div>
          {closingPosition && closeForm.exit_price && !isNaN(parseFloat(closeForm.exit_price)) && (() => {
            const exit = parseFloat(closeForm.exit_price)
            const entry = closingPosition.entry_price
            const qty = closingPosition.quantity
            const mult = closingPosition.asset_type === 'option' ? 100 : 1
            const pnl = (exit - entry) * qty * mult
            const pnl_pct = entry > 0 ? ((exit - entry) / entry) * 100 : 0
            const color = pnl >= 0 ? 'text-gain' : 'text-loss'
            return (
              <div className="bg-surface2 rounded-lg px-3 py-2.5 text-xs flex justify-between">
                <span className="text-text-muted">Realized P&L</span>
                <span className={`font-mono font-bold ${color}`}>
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                  <span className="ml-2 font-normal opacity-80">({pnl_pct >= 0 ? '+' : ''}{pnl_pct.toFixed(2)}%)</span>
                </span>
              </div>
            )
          })()}
          {formError && (
            <div className="text-loss text-xs bg-loss/10 border border-loss/30 rounded-lg px-3 py-2">{formError}</div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Closing...' : 'Confirm Close'}</Button>
            <Button type="button" variant="secondary" onClick={() => { setCloseModalOpen(false); setClosingPosition(null); setFormError(null) }}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Closed Positions */}
      {closedTrades.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-0.5 h-3.5 rounded-full bg-accent/50 inline-block" />
              <span className="text-[11px] font-semibold text-text-secondary tracking-[0.1em] uppercase">Closed Positions</span>
            </div>
            <div className="text-xs font-mono">
              Total realized:{' '}
              <span className={`font-bold ${closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) >= 0 ? 'text-gain' : 'text-loss'}`}>
                {closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) >= 0 ? '+' : ''}
                ${closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="border border-default rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-default bg-surface2">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Ticker</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Entry</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Exit</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">Realized P&L</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">P&L %</th>
                </tr>
              </thead>
              <tbody>
                {closedTrades.map((t, i) => {
                  const pnl = t.pnl ?? 0
                  const pct = t.pnl_pct ?? 0
                  const color = pnl > 0 ? 'text-gain' : pnl < 0 ? 'text-loss' : 'text-text-muted'
                  return (
                    <tr key={t.id} className={`border-b border-default last:border-0 hover:bg-surface2 transition-colors ${i % 2 === 0 ? 'bg-surface' : 'bg-bg'}`}>
                      <td className="px-4 py-2.5 text-text-secondary font-mono">{t.date}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <TickerLogo ticker={t.ticker} size={16} />
                          <span className="font-bold tracking-wider text-text-primary">{t.ticker}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-secondary">${t.entry_price.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-secondary">${t.exit_price?.toFixed(2) ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-secondary">{t.quantity}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${color}`}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono ${color}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Portfolio History */}
      <div className="mt-8">
        <button
          onClick={() => { setShowHistory(v => !v); if (!showHistory && snapshots.length === 0) loadSnapshots() }}
          className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors mb-3 group"
        >
          <span className="w-0.5 h-3.5 rounded-full bg-accent/50 inline-block" />
          <span className="font-semibold tracking-[0.1em] uppercase">Portfolio History</span>
          <span className="text-text-muted/50 group-hover:text-text-muted transition-colors">{showHistory ? '▲' : '▼'}</span>
          {snapshots.length > 0 && <span className="text-text-muted/50">{snapshots.length} snapshots</span>}
        </button>
        {showHistory && (
          snapshots.length === 0 ? (
            <div className="border border-default rounded-xl bg-surface p-8 text-center text-xs text-text-muted">
              No history yet. Snapshots are saved automatically each time you visit this page.
            </div>
          ) : (
            <div className="border border-default rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-default bg-surface2">
                    {['Date', 'Market Value', 'Cost Basis', 'Unrealized P&L', 'Positions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s, i) => {
                    const pnl = s.unrealized_pnl ?? 0
                    return (
                      <tr key={s.snapshot_date} className={`border-b border-default last:border-0 hover:bg-surface2 transition-colors ${i % 2 === 0 ? 'bg-surface' : 'bg-bg'}`}>
                        <td className="px-4 py-2.5 font-mono text-text-secondary">{s.snapshot_date}</td>
                        <td className="px-4 py-2.5 font-mono text-text-primary">{s.total_market_value != null ? `$${s.total_market_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-text-secondary">{s.total_cost_basis != null ? `$${s.total_cost_basis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                        <td className={`px-4 py-2.5 font-mono font-semibold ${pnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                          {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-text-muted">{s.position_count ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}
