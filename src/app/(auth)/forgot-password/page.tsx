'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

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
        <div
          className="rounded-2xl px-8 py-9"
          style={{
            background: 'rgba(13,17,32,0.85)',
            border: '1px solid rgba(28,38,64,0.8)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {sent ? (
            <div className="text-center">
              <div className="text-gain text-3xl mb-4">✓</div>
              <h2 className="font-display font-bold text-lg text-text-primary mb-2">Check your email</h2>
              <p className="text-text-muted text-xs leading-relaxed">
                We sent a reset link to{' '}
                <span className="text-text-secondary">{email}</span>.{' '}
                Click it to set a new password.
              </p>
              <Link href="/login" className="inline-block mt-6 text-xs text-accent hover:underline">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-xl text-text-primary mb-1.5 text-center tracking-tight">
                Reset your password
              </h1>
              <p className="text-text-muted text-xs mb-8 text-center">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-text-secondary mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className="w-full rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted/40 focus:outline-none transition-all"
                    style={{ background: 'rgba(7,9,15,0.7)', border: '1px solid rgba(28,38,64,0.9)' }}
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
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-text-muted text-xs mt-6 text-center">
                Remember it?{' '}
                <Link href="/login" className="text-accent hover:underline">Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
