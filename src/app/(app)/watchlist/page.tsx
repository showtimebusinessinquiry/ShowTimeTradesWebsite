'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { TickerLogo } from '@/components/ui/TickerLogo'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

// ─── Types ────────────────────────────────────────────────────────────────────
type Bias = 'Bullish' | 'Bearish' | 'Neutral'
type Status = 'Watching' | 'Ready' | 'In Trade' | 'Avoid'
type ViewMode = 'kanban' | 'list'
type SortKey = 'change' | 'ticker' | 'earnings' | 'added'

interface WList { id: string; name: string; createdAt: string }
interface WTicker {
  id: string; symbol: string; listId: string
  bias: Bias; status: Status
  entry: number | null; target: number | null; stop: number | null
  earningsDate: string | null; thesis: string
  createdAt: string; updatedAt: string
}
interface PriceData { price: number; change: number; changePct: number; volume: number }
interface FormVals {
  symbol: string; listId: string; bias: Bias; status: Status
  entry: string; target: string; stop: string; earningsDate: string; thesis: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES: Status[] = ['Watching', 'Ready', 'In Trade', 'Avoid']
const STATUS_LABELS: Record<Status, string> = {
  Watching: 'Watching', Ready: 'Ready to Trade', 'In Trade': 'In Trade', Avoid: 'Avoid',
}
const BIASES: Bias[] = ['Bullish', 'Bearish', 'Neutral']
const BIAS_COLOR: Record<Bias, string> = {
  Bullish: 'text-gain bg-gain/10 border-gain/20',
  Bearish: 'text-loss bg-loss/10 border-loss/20',
  Neutral: 'text-amber bg-amber/10 border-amber/20',
}
const STATUS_COLOR: Record<Status, string> = {
  Watching: 'text-text-secondary bg-surface2 border-default',
  Ready: 'text-gain bg-gain/10 border-gain/20',
  'In Trade': 'text-accent bg-accent/10 border-accent/20',
  Avoid: 'text-loss bg-loss/10 border-loss/20',
}
const LEGACY_STORAGE_KEY = 'shtj_watchlist_v2'

// ─── Utils ────────────────────────────────────────────────────────────────────
function fmtVol(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}
function earningsSoon(date: string | null) {
  if (!date) return false
  const diff = new Date(date).getTime() - Date.now()
  return diff > 0 && diff <= 14 * 86_400_000
}

// ─── DB row → WTicker / WList converters ─────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToWTicker(r: any): WTicker {
  return {
    id: r.id,
    symbol: r.ticker,
    listId: r.list_id ?? '',
    bias: (r.bias as Bias) ?? 'Neutral',
    status: (r.status_type as Status) ?? 'Watching',
    entry: r.entry_price ?? null,
    target: r.target_price ?? null,
    stop: r.stop_price ?? null,
    earningsDate: r.earnings_date ?? null,
    thesis: r.thesis ?? r.notes ?? '',
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToWList(l: any): WList {
  return { id: l.id, name: l.name, createdAt: l.created_at }
}

function defaultForm(lists: WList[]): FormVals {
  return { symbol: '', listId: lists[0]?.id ?? '', bias: 'Bullish', status: 'Watching', entry: '', target: '', stop: '', earningsDate: '', thesis: '' }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WatchlistPage() {
  const { user } = useAuth()
  const [lists, setLists] = useState<WList[]>([])
  const [tickers, setTickers] = useState<WTicker[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [view, setView] = useState<ViewMode>('kanban')
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [filterBias, setFilterBias] = useState<Bias | 'All'>('All')
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>('All')
  const [sortBy, setSortBy] = useState<SortKey>('change')
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [pricesLoading, setPricesLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormVals>(defaultForm([]))
  const [symPreview, setSymPreview] = useState<{ price: number } | 'loading' | 'invalid' | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickQuery, setQuickQuery] = useState('')
  const [newListName, setNewListName] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const quickRef = useRef<HTMLInputElement>(null)

  // ── Load from Supabase (with one-time localStorage migration) ─────────────
  useEffect(() => {
    if (!user) { setHydrated(true); return }
    const load = async () => {
      const [listsRes, tickersRes] = await Promise.all([
        supabase.from('watchlist_lists').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('watchlist').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      if (listsRes.error || tickersRes.error) {
        console.error('[Watchlist] load error:', listsRes.error ?? tickersRes.error)
        setHydrated(true)
        return
      }

      if (listsRes.data && listsRes.data.length > 0) {
        setLists(listsRes.data.map(dbToWList))
        setTickers((tickersRes.data ?? []).map(dbToWTicker))
        setHydrated(true)
        return
      }

      // No Supabase data — attempt one-time migration from localStorage
      try {
        const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
        if (raw) {
          const { lists: localLists, tickers: localTickers } = JSON.parse(raw) as { lists: WList[]; tickers: WTicker[] }
          const listIdMap: Record<string, string> = {}

          for (const list of (localLists ?? [])) {
            const { data } = await supabase
              .from('watchlist_lists')
              .insert({ user_id: user.id, name: list.name })
              .select()
              .single()
            if (data) listIdMap[list.id] = data.id
          }

          for (const t of (localTickers ?? [])) {
            const newListId = listIdMap[t.listId] ?? null
            await supabase.from('watchlist').insert({
              user_id: user.id,
              ticker: t.symbol,
              list_id: newListId,
              bias: t.bias,
              status_type: t.status,
              entry_price: t.entry,
              target_price: t.target,
              stop_price: t.stop,
              earnings_date: t.earningsDate,
              thesis: t.thesis,
              notes: t.thesis,
            })
          }

          localStorage.removeItem(LEGACY_STORAGE_KEY)

          // Re-fetch after migration
          const [lr2, tr2] = await Promise.all([
            supabase.from('watchlist_lists').select('*').eq('user_id', user.id).order('created_at'),
            supabase.from('watchlist').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          ])
          setLists((lr2.data ?? []).map(dbToWList))
          setTickers((tr2.data ?? []).map(dbToWTicker))
        }
      } catch {
        // migration failed or no legacy data — start fresh
      }

      setHydrated(true)
    }
    load()
  }, [user])

  // "/" global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        setQuickOpen(true)
        setTimeout(() => quickRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') { setQuickOpen(false); setQuickQuery('') }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Price fetching
  const fetchPrices = useCallback(async (syms: string[]) => {
    if (syms.length === 0) return
    setPricesLoading(true)
    try {
      const res = await fetch(`/api/stock-quotes?symbols=${syms.join(',')}`)
      const data: { quotes: Array<{ symbol: string } & PriceData> } = await res.json()
      setPrices(prev => {
        const next = { ...prev }
        data.quotes.forEach(q => { next[q.symbol] = { price: q.price, change: q.change, changePct: q.changePct, volume: q.volume } })
        return next
      })
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch stock prices:', err)
    }
    setPricesLoading(false)
  }, [])

  useEffect(() => {
    if (!hydrated || tickers.length === 0) return
    const syms = tickers.map(t => t.symbol).filter((s, i, a) => a.indexOf(s) === i)
    fetchPrices(syms)
    const id = setInterval(() => fetchPrices(syms), 60_000)
    return () => clearInterval(id)
  }, [hydrated, tickers, fetchPrices])

  // "Xs ago" counter
  useEffect(() => {
    if (!lastUpdated) return
    const id = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000)), 1000)
    return () => clearInterval(id)
  }, [lastUpdated])

  // Computed filtered + sorted tickers
  const visible = useMemo(() => {
    let r = tickers
    if (activeListId) r = r.filter(t => t.listId === activeListId)
    if (filterBias !== 'All') r = r.filter(t => t.bias === filterBias)
    if (filterStatus !== 'All') r = r.filter(t => t.status === filterStatus)
    return [...r].sort((a, b) => {
      if (sortBy === 'ticker') return a.symbol.localeCompare(b.symbol)
      if (sortBy === 'earnings') {
        if (!a.earningsDate && !b.earningsDate) return 0
        if (!a.earningsDate) return 1
        if (!b.earningsDate) return -1
        return a.earningsDate.localeCompare(b.earningsDate)
      }
      if (sortBy === 'added') return b.createdAt.localeCompare(a.createdAt)
      return (prices[b.symbol]?.changePct ?? -999) - (prices[a.symbol]?.changePct ?? -999)
    })
  }, [tickers, activeListId, filterBias, filterStatus, sortBy, prices])

  const listCount = (id: string) => tickers.filter(t => t.listId === id).length

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAdd = (prefill = '') => {
    setEditingId(null)
    setForm({ ...defaultForm(lists), symbol: prefill })
    setSymPreview(null)
    setPanelOpen(true)
  }
  const openEdit = (t: WTicker) => {
    setEditingId(t.id)
    setForm({ symbol: t.symbol, listId: t.listId, bias: t.bias, status: t.status, entry: t.entry?.toString() ?? '', target: t.target?.toString() ?? '', stop: t.stop?.toString() ?? '', earningsDate: t.earningsDate ?? '', thesis: t.thesis })
    setSymPreview(null)
    setPanelOpen(true)
  }
  const closePanel = () => { setPanelOpen(false); setEditingId(null); setSymPreview(null) }

  const handleSymBlur = async () => {
    const sym = form.symbol.trim().toUpperCase()
    if (!sym) return
    setSymPreview('loading')
    try {
      const res = await fetch(`/api/stock-quotes?symbols=${sym}`)
      const data: { quotes: Array<{ symbol: string } & PriceData> } = await res.json()
      const q = data.quotes.find(q => q.symbol === sym)
      if (q) { setSymPreview({ price: q.price }); setPrices(prev => ({ ...prev, [sym]: q })) }
      else setSymPreview('invalid')
    } catch { setSymPreview('invalid') }
  }

  const handleSave = async () => {
    const sym = form.symbol.trim().toUpperCase()
    if (!sym || !form.listId || !user) return
    const now = new Date().toISOString()
    const payload = {
      ticker: sym,
      list_id: form.listId || null,
      bias: form.bias,
      status_type: form.status,
      entry_price: form.entry ? parseFloat(form.entry) : null,
      target_price: form.target ? parseFloat(form.target) : null,
      stop_price: form.stop ? parseFloat(form.stop) : null,
      earnings_date: form.earningsDate || null,
      thesis: form.thesis,
      notes: form.thesis,
      updated_at: now,
    }
    if (editingId) {
      const { error } = await supabase.from('watchlist').update(payload).eq('id', editingId)
      if (!error) {
        setTickers(prev => prev.map(t => t.id === editingId
          ? { ...t, symbol: sym, listId: form.listId, bias: form.bias, status: form.status, entry: payload.entry_price, target: payload.target_price, stop: payload.stop_price, earningsDate: payload.earnings_date, thesis: form.thesis, updatedAt: now }
          : t))
      }
    } else {
      const { data, error } = await supabase
        .from('watchlist')
        .insert({ user_id: user.id, ...payload })
        .select()
        .single()
      if (!error && data) {
        setTickers(prev => [dbToWTicker(data), ...prev])
        fetchPrices([sym])
      }
    }
    closePanel()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove from watchlist?')) return
    await supabase.from('watchlist').delete().eq('id', id)
    setTickers(prev => prev.filter(t => t.id !== id))
  }

  const handleDrop = async (newStatus: Status) => {
    if (!dragId) return
    const now = new Date().toISOString()
    await supabase.from('watchlist').update({ status_type: newStatus, updated_at: now }).eq('id', dragId)
    setTickers(prev => prev.map(t => t.id === dragId ? { ...t, status: newStatus, updatedAt: now } : t))
    setDragId(null); setDragOverCol(null)
  }

  const handleAddList = async () => {
    const name = newListName.trim()
    if (!name || !user) return
    const { data, error } = await supabase
      .from('watchlist_lists')
      .insert({ user_id: user.id, name })
      .select()
      .single()
    if (!error && data) setLists(prev => [...prev, dbToWList(data)])
    setNewListName(''); setShowNewList(false)
  }

  const handleDeleteList = async (id: string) => {
    if (!confirm('Delete list? Tickers in this list will be unassigned.')) return
    const generalId = lists.find(l => l.name.toLowerCase() === 'general')?.id
    if (generalId) {
      await supabase.from('watchlist').update({ list_id: generalId }).eq('list_id', id)
      setTickers(prev => prev.map(t => t.listId === id ? { ...t, listId: generalId } : t))
    } else {
      await supabase.from('watchlist').update({ list_id: null }).eq('list_id', id)
      setTickers(prev => prev.map(t => t.listId === id ? { ...t, listId: '' } : t))
    }
    await supabase.from('watchlist_lists').delete().eq('id', id)
    setLists(prev => prev.filter(l => l.id !== id))
    if (activeListId === id) setActiveListId(null)
  }

  const handleExportCSV = () => {
    const cols = ['Ticker', 'Bias', 'Status', 'Price', 'Change%', 'Volume', 'Entry', 'Target', 'Stop', 'Earnings', 'Thesis', 'List', 'Added']
    const rows = visible.map(t => {
      const p = prices[t.symbol]
      const list = lists.find(l => l.id === t.listId)
      return [t.symbol, t.bias, t.status, p?.price.toFixed(2) ?? '', p?.changePct.toFixed(2) ?? '', p ? fmtVol(p.volume) : '', t.entry?.toFixed(2) ?? '', t.target?.toFixed(2) ?? '', t.stop?.toFixed(2) ?? '', t.earningsDate ?? '', `"${t.thesis.replace(/"/g, '""')}"`, list?.name ?? '', t.createdAt.slice(0, 10)].join(',')
    })
    const csv = [cols.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'watchlist.csv'; a.click(); URL.revokeObjectURL(a.href)
  }

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  if (!hydrated) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
      <div className="text-text-muted text-sm animate-pulse">Loading watchlist…</div>
    </div>
  )

  const inputCls = 'w-full bg-bg border border-default px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent rounded-lg transition-colors'
  const labelCls = 'block text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase mb-1.5'

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Quick-add overlay ── */}
      {quickOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-36 bg-black/60 backdrop-blur-sm" onClick={() => { setQuickOpen(false); setQuickQuery('') }}>
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={e => { e.preventDefault(); const s = quickQuery.trim().toUpperCase(); if (s) { setQuickOpen(false); setQuickQuery(''); openAdd(s) } }}
            className="bg-surface border border-default rounded-xl p-4 w-72 shadow-2xl"
          >
            <div className="text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase mb-2">Quick Add · Press Enter</div>
            <input ref={quickRef} value={quickQuery} onChange={e => setQuickQuery(e.target.value.toUpperCase())} placeholder="TICKER" className="w-full bg-bg border border-default px-3 py-2 text-lg font-mono font-bold text-text-primary placeholder-text-muted focus:outline-none focus:border-accent rounded-lg" />
          </form>
        </div>
      )}

      {/* ── Slide-out panel ── */}
      {panelOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={closePanel} />}
      <div className={`fixed right-0 top-0 h-full w-[420px] bg-surface border-l border-default z-50 flex flex-col transform transition-transform duration-300 ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="px-6 py-5 border-b border-default flex items-center justify-between flex-shrink-0">
          <span className="font-display font-bold text-text-primary">{editingId ? 'Edit Ticker' : 'Add Ticker'}</span>
          <button onClick={closePanel} className="text-text-muted hover:text-text-primary text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Symbol */}
          <div>
            <label className={labelCls}>Ticker Symbol</label>
            <div className="flex items-center gap-2">
              <input value={form.symbol} onChange={e => { setForm(p => ({ ...p, symbol: e.target.value.toUpperCase() })); setSymPreview(null) }} onBlur={handleSymBlur} placeholder="NVDA" className={`${inputCls} font-mono font-bold flex-1`} />
              {symPreview === 'loading' && <span className="text-xs text-text-muted whitespace-nowrap animate-pulse">Checking…</span>}
              {symPreview === 'invalid' && <span className="text-xs text-loss whitespace-nowrap">Not found</span>}
              {symPreview && typeof symPreview === 'object' && <span className="text-xs text-gain font-mono whitespace-nowrap">${symPreview.price.toFixed(2)} ✓</span>}
            </div>
          </div>
          {/* List */}
          <div>
            <label className={labelCls}>List</label>
            <select value={form.listId} onChange={e => setForm(p => ({ ...p, listId: e.target.value }))} className={inputCls}>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          {/* Bias */}
          <div>
            <label className={labelCls}>Bias</label>
            <div className="flex gap-2">
              {BIASES.map(b => (
                <button key={b} type="button" onClick={() => setForm(p => ({ ...p, bias: b }))} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${form.bias === b ? BIAS_COLOR[b] : 'text-text-muted border-default bg-bg hover:bg-surface2'}`}>{b}</button>
              ))}
            </div>
          </div>
          {/* Status */}
          <div>
            <label className={labelCls}>Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <button key={s} type="button" onClick={() => setForm(p => ({ ...p, status: s }))} className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${form.status === s ? STATUS_COLOR[s] : 'text-text-muted border-default bg-bg hover:bg-surface2'}`}>{STATUS_LABELS[s]}</button>
              ))}
            </div>
          </div>
          {/* Key levels */}
          <div>
            <label className={labelCls}>Key Levels</label>
            <div className="grid grid-cols-3 gap-2">
              {(['entry', 'target', 'stop'] as const).map(f => (
                <div key={f}>
                  <div className="text-[10px] text-text-muted mb-1 capitalize">{f}</div>
                  <input type="number" step="0.01" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} placeholder="—" className="w-full bg-bg border border-default px-2 py-1.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent rounded-lg transition-colors" />
                </div>
              ))}
            </div>
          </div>
          {/* Earnings */}
          <div>
            <label className={labelCls}>Earnings Date (optional)</label>
            <input type="date" value={form.earningsDate} onChange={e => setForm(p => ({ ...p, earningsDate: e.target.value }))} className={inputCls} style={{ colorScheme: 'dark' }} />
          </div>
          {/* Thesis */}
          <div>
            <label className={labelCls}>Thesis / Trade Idea</label>
            <textarea value={form.thesis} onChange={e => setForm(p => ({ ...p, thesis: e.target.value }))} rows={4} placeholder="Setup rationale, catalysts, key levels to watch…" className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="px-6 py-5 border-t border-default flex gap-3 flex-shrink-0">
          <button onClick={handleSave} disabled={!form.symbol.trim()} className="flex-1 bg-gradient-to-r from-accent to-[#ff6655] text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-40 hover:brightness-110 transition-all">
            {editingId ? 'Update' : 'Add to Watchlist'}
          </button>
          <button onClick={closePanel} className="px-4 text-sm text-text-secondary border border-default rounded-lg hover:bg-surface2 transition-colors">Cancel</button>
        </div>
      </div>

      {/* ── Lists sidebar ── */}
      <div className="w-48 flex-shrink-0 border-r border-default bg-surface flex flex-col overflow-y-auto">
        <div className="px-4 pt-5 pb-2">
          <div className="text-[10px] font-semibold text-text-muted tracking-[0.16em] uppercase">Lists</div>
        </div>
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          <button onClick={() => setActiveListId(null)} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${activeListId === null ? 'text-text-primary bg-surface2 font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-surface2/50'}`}>
            <span>All Tickers</span>
            <span className="text-[11px] font-mono text-text-muted">{tickers.length}</span>
          </button>
          {lists.map(list => (
            <div key={list.id} className="group relative">
              <button onClick={() => setActiveListId(list.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${activeListId === list.id ? 'text-accent bg-gradient-to-r from-accent/15 to-accent/[0.03] shadow-[inset_2px_0_0_#ff3333] font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-surface2/50'}`}>
                <span className="truncate">{list.name}</span>
                <span className="text-[11px] font-mono text-text-muted flex-shrink-0 ml-1">{listCount(list.id)}</span>
              </button>
              <button onClick={() => handleDeleteList(list.id)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-loss opacity-0 group-hover:opacity-100 transition-all text-sm leading-none">×</button>
            </div>
          ))}
        </div>
        <div className="mt-auto px-3 pb-4 pt-3 border-t border-default/40">
          {showNewList ? (
            <div className="flex gap-1">
              <input value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setShowNewList(false) }} placeholder="List name" autoFocus className="flex-1 bg-bg border border-default px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent rounded" />
              <button onClick={handleAddList} className="text-xs text-accent px-1.5 hover:text-text-primary transition-colors">✓</button>
            </div>
          ) : (
            <button onClick={() => setShowNewList(true)} className="w-full text-xs text-text-muted hover:text-accent transition-colors py-1 flex items-center gap-1.5">
              <span>+</span><span>New List</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 border-b border-default/40 px-8 pt-7 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight leading-none">Watchlist</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-mono text-text-muted uppercase tracking-widest">{visible.length} tickers</span>
                {lastUpdated && (
                  <span className="text-xs font-mono text-text-muted flex items-center gap-1.5">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${pricesLoading ? 'bg-accent animate-pulse' : 'bg-gain'}`} />
                    {pricesLoading ? 'Refreshing…' : `Updated ${secondsAgo}s ago`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <button onClick={handleExportCSV} className="text-xs text-text-secondary border border-default px-3 py-1.5 rounded-lg hover:bg-surface2 transition-colors">Export CSV</button>
              <div className="flex border border-default rounded-lg overflow-hidden">
                {(['kanban', 'list'] as ViewMode[]).map(v => (
                  <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${view === v ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface2'}`}>
                    {v === 'kanban' ? 'Kanban' : 'List'}
                  </button>
                ))}
              </div>
              <button onClick={() => openAdd()} className="bg-gradient-to-r from-accent to-[#ff6655] text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:brightness-110 transition-all">
                + Add Ticker
              </button>
            </div>
          </div>

          {/* Filter + sort bar */}
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">Bias</span>
              {(['All', ...BIASES] as Array<'All' | Bias>).map(b => (
                <button key={b} onClick={() => setFilterBias(b)} className={`px-2.5 py-0.5 rounded-md transition-colors ${filterBias === b ? (b === 'All' ? 'bg-surface2 text-text-primary' : BIAS_COLOR[b]) : 'text-text-muted hover:text-text-secondary'}`}>{b}</button>
              ))}
            </div>
            <div className="w-px h-3.5 bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">Status</span>
              {(['All', ...STATUSES] as Array<'All' | Status>).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-2.5 py-0.5 rounded-md transition-colors ${filterStatus === s ? (s === 'All' ? 'bg-surface2 text-text-primary' : STATUS_COLOR[s]) : 'text-text-muted hover:text-text-secondary'}`}>
                  {s === 'All' ? 'All' : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="w-px h-3.5 bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">Sort</span>
              {([['change', '% Change'], ['ticker', 'A–Z'], ['earnings', 'Earnings'], ['added', 'Date Added']] as [SortKey, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setSortBy(k)} className={`px-2.5 py-0.5 rounded-md transition-colors ${sortBy === k ? 'bg-surface2 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}>{label}</button>
              ))}
            </div>
            <div className="ml-auto text-text-muted/50 text-[10px] hidden sm:block">Press <kbd className="bg-surface2 border border-default px-1 py-0.5 rounded text-[9px]">/</kbd> to quick-add</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">

          {/* ── KANBAN VIEW ── */}
          {view === 'kanban' && (
            <div className="grid grid-cols-4 gap-4 min-w-[800px]">
              {STATUSES.map(status => {
                const col = visible.filter(t => t.status === status)
                const isDrop = dragOverCol === status
                return (
                  <div key={status} onDragOver={e => { e.preventDefault(); setDragOverCol(status) }} onDragLeave={() => setDragOverCol(null)} onDrop={() => handleDrop(status)}
                    className={`flex flex-col gap-3 rounded-xl p-3 min-h-96 transition-all ${isDrop ? 'bg-accent/5 ring-1 ring-accent/30' : 'bg-surface/40'}`}>
                    {/* Column header */}
                    <div className="flex items-center justify-between px-1 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold tracking-wider ${STATUS_COLOR[status].split(' ')[0]}`}>{STATUS_LABELS[status].toUpperCase()}</span>
                      </div>
                      <span className="text-[11px] font-mono text-text-muted bg-surface2 px-1.5 py-0.5 rounded">{col.length}</span>
                    </div>
                    {/* Cards */}
                    {col.map(t => {
                      const p = prices[t.symbol]
                      const soon = earningsSoon(t.earningsDate)
                      const isExp = !!expanded[t.id]
                      return (
                        <div key={t.id} draggable onDragStart={() => setDragId(t.id)} onDragEnd={() => { setDragId(null); setDragOverCol(null) }}
                          className={`bg-surface border rounded-xl p-4 cursor-grab active:cursor-grabbing select-none transition-all ${dragId === t.id ? 'opacity-40 scale-95 border-accent/40' : 'border-default/60 hover:border-border'}`}>
                          {/* Header row */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <TickerLogo ticker={t.symbol} size={22} />
                              <div>
                                <div className="font-bold text-sm text-text-primary tracking-wider leading-none mb-1">{t.symbol}</div>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${BIAS_COLOR[t.bias]}`}>{t.bias}</span>
                              </div>
                            </div>
                            <a href={`https://www.tradingview.com/chart/?symbol=${t.symbol}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Open TradingView" className="text-text-muted hover:text-accent transition-colors text-sm">↗</a>
                          </div>
                          {/* Price row */}
                          {p ? (
                            <div className="flex items-baseline gap-2 mb-3">
                              <span className="text-lg font-bold font-mono text-text-primary">${p.price.toFixed(2)}</span>
                              <span className={`text-sm font-mono font-semibold ${p.changePct >= 0 ? 'text-gain' : 'text-loss'}`}>{p.changePct >= 0 ? '+' : ''}{p.changePct.toFixed(2)}%</span>
                              <span className="text-[11px] text-text-muted font-mono ml-auto">{fmtVol(p.volume)}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mb-3">
                              <span className="text-sm font-mono text-text-muted">—</span>
                              <button onClick={() => fetchPrices([t.symbol])} className="text-[10px] text-text-muted hover:text-accent transition-colors">↻</button>
                            </div>
                          )}
                          {/* Key levels */}
                          {(t.entry || t.target || t.stop) && (
                            <div className="flex gap-3 text-[10px] font-mono mb-3">
                              {t.entry != null && <span className="text-text-muted">E <span className="text-text-secondary">${t.entry}</span></span>}
                              {t.target != null && <span className="text-text-muted">T <span className="text-gain">${t.target}</span></span>}
                              {t.stop != null && <span className="text-text-muted">S <span className="text-loss">${t.stop}</span></span>}
                            </div>
                          )}
                          {/* Earnings */}
                          {soon && <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber bg-amber/10 border border-amber/20 rounded-full px-2 py-0.5 mb-3">⚡ Earnings Soon</div>}
                          {t.earningsDate && !soon && <div className="text-[10px] text-text-muted mb-3">Earnings {t.earningsDate}</div>}
                          {/* Thesis */}
                          {t.thesis && (
                            <div className="mb-3">
                              <p className={`text-[11px] text-text-muted leading-relaxed ${isExp ? '' : 'line-clamp-2'}`}>{t.thesis}</p>
                              {t.thesis.length > 90 && <button onClick={() => toggleExpand(t.id)} className="text-[10px] text-accent mt-0.5 hover:underline">{isExp ? 'collapse' : 'expand'}</button>}
                            </div>
                          )}
                          {/* Footer */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-default/40">
                            <span className="text-[10px] text-text-muted font-mono">{t.createdAt.slice(0, 10)}</span>
                            <div className="flex gap-2.5">
                              <button onClick={() => openEdit(t)} className="text-[10px] text-text-muted hover:text-accent transition-colors">Edit</button>
                              <button onClick={() => handleDelete(t.id)} className="text-[10px] text-text-muted hover:text-loss transition-colors">Del</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {col.length === 0 && (
                      <div className={`flex-1 min-h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-xs transition-colors ${isDrop ? 'border-accent/40 text-accent/60' : 'border-default/30 text-text-muted/40'}`}>
                        {isDrop ? 'Drop here' : 'Empty'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <div className="border border-default rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-xs min-w-[960px]">
                <thead>
                  <tr className="border-b border-default bg-surface2">
                    {['Ticker', 'Price', 'Change %', 'Volume', 'Bias', 'Status', 'Entry', 'Target', 'Stop', 'Earnings', 'Actions'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((t, i) => {
                    const p = prices[t.symbol]
                    const soon = earningsSoon(t.earningsDate)
                    return (
                      <tr key={t.id} className={`border-b border-default hover:bg-surface2/40 transition-colors ${i % 2 === 0 ? 'bg-surface' : 'bg-bg'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <TickerLogo ticker={t.symbol} size={18} />
                            <span className="font-bold tracking-wider text-text-primary">{t.symbol}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-text-primary">{p ? `$${p.price.toFixed(2)}` : '—'}</td>
                        <td className={`px-4 py-3 font-mono font-semibold ${!p ? 'text-text-muted' : p.changePct >= 0 ? 'text-gain' : 'text-loss'}`}>{p ? `${p.changePct >= 0 ? '+' : ''}${p.changePct.toFixed(2)}%` : '—'}</td>
                        <td className="px-4 py-3 font-mono text-text-muted">{p ? fmtVol(p.volume) : '—'}</td>
                        <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${BIAS_COLOR[t.bias]}`}>{t.bias}</span></td>
                        <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${STATUS_COLOR[t.status]}`}>{STATUS_LABELS[t.status]}</span></td>
                        <td className="px-4 py-3 font-mono text-text-secondary">{t.entry != null ? `$${t.entry}` : '—'}</td>
                        <td className="px-4 py-3 font-mono text-gain">{t.target != null ? `$${t.target}` : '—'}</td>
                        <td className="px-4 py-3 font-mono text-loss">{t.stop != null ? `$${t.stop}` : '—'}</td>
                        <td className="px-4 py-3">
                          {soon ? <span className="text-[10px] font-semibold text-amber bg-amber/10 border border-amber/20 rounded-full px-2 py-0.5">⚡ Soon</span>
                            : t.earningsDate ? <span className="font-mono text-text-muted">{t.earningsDate}</span> : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <a href={`https://www.tradingview.com/chart/?symbol=${t.symbol}`} target="_blank" rel="noopener noreferrer" title="TradingView" className="text-text-muted hover:text-accent transition-colors text-sm">↗</a>
                            <button onClick={() => openEdit(t)} className="text-text-muted hover:text-accent transition-colors">Edit</button>
                            <button onClick={() => handleDelete(t.id)} className="text-text-muted hover:text-loss transition-colors">Del</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {visible.length === 0 && <div className="py-16 text-center text-text-muted text-sm">No tickers match the current filters.</div>}
            </div>
          )}

          {tickers.length === 0 && (
            <div className="text-center py-20">
              <div className="text-text-muted text-sm mb-2">No tickers yet.</div>
              <div className="text-text-muted text-xs">Press <kbd className="bg-surface2 border border-default px-1.5 py-0.5 rounded text-[10px]">/</kbd> or click <span className="text-accent cursor-pointer" onClick={() => openAdd()}>+ Add Ticker</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
