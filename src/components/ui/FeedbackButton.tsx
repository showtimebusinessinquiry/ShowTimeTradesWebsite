'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { InsertFeedback } from '@/types/database'

type FeedbackType = 'bug' | 'suggestion'

interface FormState {
  type: FeedbackType
  title: string
  description: string
}

export function FeedbackButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ type: 'bug', title: '', description: '' })

  if (!user) return null

  const handleOpen = () => {
    setForm({ type: 'bug', title: '', description: '' })
    setError(null)
    setSubmitted(false)
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { setError('Session expired. Please sign in again.'); return }
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    const payload: InsertFeedback = {
      user_id: user.id,
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || null,
    }
    const { error: err } = await supabase.from('feedback').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    setSubmitted(true)
  }

  const inputClass = "w-full bg-bg border border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-surface border border-default text-text-muted hover:text-accent hover:border-accent transition-all shadow-lg flex items-center justify-center text-lg btn-glow-subtle"
        title="Submit feedback or report a bug"
      >
        ?
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-surface border border-default rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-default">
              <h2 className="text-sm font-semibold text-text-primary">Submit Feedback</h2>
              <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary text-lg leading-none">×</button>
            </div>

            <div className="p-5">
              {submitted ? (
                <div className="text-center py-6 space-y-3">
                  <div className="text-3xl">✓</div>
                  <div className="text-sm font-medium text-text-primary">Thanks for the feedback!</div>
                  <div className="text-xs text-text-muted">Our team will review your submission.</div>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-4 text-xs text-accent hover:underline"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Type toggle */}
                  <div className="flex gap-2">
                    {(['bug', 'suggestion'] as FeedbackType[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, type: t }))}
                        className={`flex-1 text-xs py-2 rounded-lg border transition-all capitalize ${
                          form.type === t
                            ? 'border-accent text-accent bg-accent/10'
                            : 'border-default text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {t === 'bug' ? '🐛 Bug Report' : '💡 Suggestion'}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs text-text-muted tracking-wide uppercase mb-1.5">
                      Title
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder={form.type === 'bug' ? 'What went wrong?' : 'What would you like to see?'}
                      className={inputClass}
                      maxLength={120}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-text-muted tracking-wide uppercase mb-1.5">
                      Details <span className="normal-case text-text-muted">(optional)</span>
                    </label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder={form.type === 'bug' ? 'Steps to reproduce, expected vs actual behaviour...' : 'More context, use cases...'}
                      rows={4}
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  {error && (
                    <div className="text-loss text-xs bg-loss/10 border border-loss/30 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-accent text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Submitting...' : 'Submit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="px-4 text-xs text-text-muted border border-default rounded-lg hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
