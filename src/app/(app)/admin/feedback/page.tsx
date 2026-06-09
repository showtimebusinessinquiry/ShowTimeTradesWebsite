'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Feedback } from '@/types/database'

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved'

const STATUS_LABELS: Record<Feedback['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

const STATUS_COLORS: Record<Feedback['status'], string> = {
  open: 'bg-accent/10 text-accent border-accent/30',
  in_progress: 'bg-amber/10 text-amber border-amber/30',
  resolved: 'bg-gain/10 text-gain border-gain/30',
}

const TYPE_COLORS: Record<Feedback['type'], string> = {
  bug: 'bg-loss/10 text-loss border-loss/30',
  suggestion: 'bg-surface2 text-text-secondary border-default',
}

interface FeedbackWithEmail extends Feedback {
  email?: string
}

export default function AdminFeedbackPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [tickets, setTickets] = useState<FeedbackWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FeedbackWithEmail | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          router.replace('/dashboard')
        } else {
          setIsAdmin(true)
        }
      })
  }, [user, router])

  useEffect(() => {
    if (!isAdmin) return
    fetchTickets()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    setTickets((data ?? []) as FeedbackWithEmail[])
    setLoading(false)
  }

  const updateStatus = async (id: string, status: Feedback['status']) => {
    setUpdating(id)
    await supabase
      .from('feedback')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    if (selected?.id === id) setSelected(s => s ? { ...s, status } : s)
    setUpdating(null)
  }

  const filtered = useMemo(
    () => statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter),
    [tickets, statusFilter]
  )

  const counts = useMemo(() => ({
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }), [tickets])

  if (!user || isAdmin === null) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-accent text-xs tracking-widest uppercase animate-pulse">Checking access...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-accent text-xs tracking-widest uppercase animate-pulse">Loading tickets...</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Feedback Tickets</h1>
        <p className="text-sm text-text-muted mt-1">{tickets.length} total submissions</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(['open', 'in_progress', 'resolved'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={`bg-surface border rounded-xl px-4 py-3 text-left transition-all ${
              statusFilter === s ? 'border-accent' : 'border-default hover:border-default/80'
            }`}
          >
            <div className="text-2xl font-bold font-mono text-text-primary">{counts[s]}</div>
            <div className="text-xs text-text-muted mt-0.5">{STATUS_LABELS[s]}</div>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {(['all', 'open', 'in_progress', 'resolved'] as StatusFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${
              statusFilter === f
                ? 'border-accent text-accent bg-accent/10'
                : 'border-default text-text-muted hover:text-text-primary'
            }`}
          >
            {f === 'all' ? `All (${tickets.length})` : STATUS_LABELS[f as Feedback['status']]}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Ticket list */}
        <div className="flex-1 min-w-0 space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-surface border border-default rounded-xl p-8 text-center text-text-muted text-sm">
              No tickets in this category.
            </div>
          ) : (
            filtered.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setSelected(selected?.id === ticket.id ? null : ticket)}
                className={`w-full text-left bg-surface border rounded-xl px-4 py-3 transition-all hover:border-default/80 ${
                  selected?.id === ticket.id ? 'border-accent' : 'border-default'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium capitalize ${TYPE_COLORS[ticket.type]}`}>
                        {ticket.type === 'bug' ? '🐛 Bug' : '💡 Suggestion'}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_COLORS[ticket.status]}`}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-text-primary truncate">{ticket.title}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {ticket.created_at.slice(0, 10)}
                      {ticket.description && (
                        <span className="ml-2 opacity-60 truncate">· {ticket.description.slice(0, 60)}{ticket.description.length > 60 ? '…' : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-surface border border-default rounded-xl p-5 sticky top-8 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-1.5 py-0.5 rounded border font-medium capitalize ${TYPE_COLORS[selected.type]}`}>
                  {selected.type === 'bug' ? '🐛 Bug' : '💡 Suggestion'}
                </span>
              </div>

              <div>
                <div className="text-sm font-semibold text-text-primary">{selected.title}</div>
                <div className="text-xs text-text-muted mt-1">{selected.created_at.slice(0, 10)}</div>
              </div>

              {selected.description && (
                <div className="text-xs text-text-secondary bg-bg rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
                  {selected.description}
                </div>
              )}

              <div>
                <div className="text-xs text-text-muted tracking-wide uppercase mb-2">Status</div>
                <div className="space-y-1.5">
                  {(['open', 'in_progress', 'resolved'] as Feedback['status'][]).map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      disabled={updating === selected.id || selected.status === s}
                      className={`w-full text-xs py-2 px-3 rounded-lg border text-left transition-all disabled:opacity-60 ${
                        selected.status === s
                          ? STATUS_COLORS[s]
                          : 'border-default text-text-muted hover:text-text-primary hover:border-default/80'
                      }`}
                    >
                      {updating === selected.id && selected.status !== s ? '...' : STATUS_LABELS[s]}
                      {selected.status === s && ' ✓'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
