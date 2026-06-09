'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    const timer = setTimeout(() => setTimedOut(true), 9000)
    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setError(null)
    if (password !== confirmPassword) { setError('Passwords do not match.'); submitting.current = false; return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); submitting.current = false; return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    submitting.current = false
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  const cardStyle = {
    background: 'rgba(13,17,32,0.85)',
    border: '1px solid rgba(28,38,64,0.8)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
    backdropFilter: 'blur(12px)',
  }

  const inputStyle = { background: 'rgba(7,9,15,0.7)', border: '1px solid rgba(28,38,64,0.9)' }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse 100% 60% at 50% -10%, rgba(255,51,51,0.06) 0%, transparent 60%), #07090f' }}
    >
      <div className="mb-10 text-center">
        <div className="w-24 h-24 mx-auto mb-4">
          <Image src="/logo.png" alt="ShowTime" width={96} height={96} className="object-contain w-full h-full" priority />
        </div>
        <div className="font-display font-extrabold text-2xl tracking-[0.14em] text-text-primary uppercase">
          Show<span className="text-accent">Time</span>
          <sup className="text-[10px] font-normal text-text-muted tracking-normal align-super ml-0.5">™</sup>
        </div>
        <div className="text-[10px] text-text-muted tracking-[0.3em] uppercase mt-1">Trading Journal</div>
      </div>

      <div className="w-full max-w-[380px] relative">
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-2/5 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(255,51,51,0.7), transparent)' }} />
        <div className="rounded-2xl px-8 py-9" style={cardStyle}>
          {done ? (
            <div className="text-center">
              <div className="text-gain text-3xl mb-4">✓</div>
              <h2 className="font-display font-bold text-lg text-text-primary mb-2">Password updated</h2>
              <p className="text-text-muted text-xs">Redirecting you to the dashboard…</p>
            </div>
          ) : !ready ? (
            <div className="text-center">
              {timedOut ? (
                <>
                  <div className="text-loss text-3xl mb-4">✕</div>
                  <h2 className="font-display font-bold text-lg text-text-primary mb-2">Link expired</h2>
                  <p className="text-text-muted text-xs leading-relaxed mb-4">
                    This reset link has expired or already been used.
                  </p>
                  <Link href="/forgot-password" className="text-accent text-xs hover:underline">
                    Request a new link
                  </Link>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-text-muted text-xs">Verifying reset link…</p>
                </>
              )}
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-xl text-text-primary mb-1.5 text-center tracking-tight">
                Set new password
              </h1>
              <p className="text-text-muted text-xs mb-8 text-center">
                Choose a strong password for your account.
              </p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs text-text-secondary mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Min. 6 characters"
                      className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-text-primary placeholder-text-muted/40 focus:outline-none transition-all"
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,51,51,0.4)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(28,38,64,0.9)')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted/50 hover:text-text-muted transition-colors"
                    >
                      {showPw ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat password"
                    className="w-full rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted/40 focus:outline-none transition-all"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,51,51,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(28,38,64,0.9)')}
                  />
                </div>
                {error && (
                  <div className="text-loss text-xs bg-loss/10 border border-loss/20 rounded-xl px-3 py-2">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-signin-glow w-full rounded-xl py-3.5 text-sm font-bold text-text-primary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(19,27,46,0.9)', border: '1px solid rgba(28,38,64,0.9)' }}
                >
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
