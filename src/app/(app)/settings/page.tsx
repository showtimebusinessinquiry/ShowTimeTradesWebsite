'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('No active session. Please sign in again.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/account/delete', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to delete account. Please try again.')
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="font-display font-bold text-xl text-text-primary mb-8 tracking-tight">Settings</h1>

      <div className="bg-surface border border-default p-6">
        <h2 className="font-display font-semibold text-base text-text-primary mb-1 tracking-tight">Delete Account</h2>
        <p className="text-text-muted text-xs leading-relaxed mb-4">
          This permanently deletes your account and all associated data — trades, portfolio positions,
          wheel cycles, watchlists, and snapshots. This action cannot be undone.
        </p>

        <div className="mb-4">
          <label className="block text-xs text-text-secondary tracking-widest uppercase mb-2">
            Type <span className="text-loss font-mono font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full bg-bg border border-default px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-loss transition-colors"
          />
        </div>

        {error && (
          <div className="text-loss text-xs bg-loss/10 border border-loss/20 px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleDelete}
          disabled={confirmText !== 'DELETE' || loading}
          className="w-full bg-loss text-white font-bold text-xs tracking-widest uppercase py-3 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Deleting account…' : 'Delete My Account'}
        </button>
      </div>
    </div>
  )
}
