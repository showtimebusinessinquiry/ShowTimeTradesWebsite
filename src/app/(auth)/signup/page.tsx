'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export default function SignupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setUsernameStatus('idle')

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value) return

    if (!USERNAME_RE.test(value)) {
      setUsernameStatus('invalid')
      return
    }

    setUsernameStatus('checking')
    debounceRef.current = setTimeout(async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('username', value.toLowerCase())
      setUsernameStatus((count ?? 0) > 0 ? 'taken' : 'available')
    }, 400)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!USERNAME_RE.test(username)) {
      setError('Username must be 3–20 characters, letters, numbers, and underscores only.')
      return
    }
    if (usernameStatus === 'taken') {
      setError('That username is already taken.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    // Double-check uniqueness right before submit to close the race window
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('username', username.toLowerCase())

    if ((count ?? 0) > 0) {
      setError('That username was just taken. Please choose another.')
      setUsernameStatus('taken')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Stored in user_metadata; the DB trigger mirrors this to the profiles table
        data: { username: username.toLowerCase() },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/dashboard')
    } else {
      setEmailSent(true)
      setLoading(false)
    }
  }

  const usernameHint = () => {
    if (usernameStatus === 'invalid')   return { text: 'Letters, numbers, underscores — 3 to 20 chars', color: 'text-loss' }
    if (usernameStatus === 'checking')  return { text: 'Checking availability…', color: 'text-text-muted' }
    if (usernameStatus === 'taken')     return { text: 'Username is already taken', color: 'text-loss' }
    if (usernameStatus === 'available') return { text: 'Username is available', color: 'text-gain' }
    return null
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <div className="font-display font-extrabold text-2xl tracking-tight">
              Show<span className="text-accent">Time</span> Trades
            </div>
            <div className="text-xs text-text-muted tracking-widest uppercase mt-1">Trading Journal</div>
          </div>
          <div className="bg-surface border border-default p-8 text-center">
            <div className="text-accent text-3xl mb-4">✓</div>
            <h2 className="font-display font-bold text-lg text-text-primary mb-2">Check your email</h2>
            <p className="text-text-muted text-xs leading-relaxed">
              We sent a confirmation link to <span className="text-text-secondary">{email}</span>.
              Click the link to activate your account, then sign in.
            </p>
            <Link
              href="/login"
              className="inline-block mt-6 text-xs text-accent hover:underline tracking-wide"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const hint = usernameHint()

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="font-display font-extrabold text-2xl tracking-tight">
            Show<span className="text-accent">Time</span>
          </div>
          <div className="text-xs text-text-muted tracking-widest uppercase mt-1">Trading Journal</div>
        </div>

        <div className="bg-surface border border-default p-8">
          <h1 className="font-display font-bold text-xl text-text-primary mb-1 tracking-tight">Create Account</h1>
          <p className="text-text-muted text-xs mb-8 tracking-wide">Start tracking your edge.</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary tracking-widest uppercase mb-2">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => handleUsernameChange(e.target.value)}
                  required
                  placeholder="your_handle"
                  maxLength={20}
                  autoComplete="username"
                  className={`w-full bg-bg border pl-8 pr-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none transition-colors ${
                    usernameStatus === 'available' ? 'border-gain/60 focus:border-gain' :
                    usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-loss/60 focus:border-loss' :
                    'border-default focus:border-accent'
                  }`}
                />
              </div>
              {hint && (
                <p className={`text-[11px] mt-1.5 ${hint.color}`}>{hint.text}</p>
              )}
              {!hint && (
                <p className="text-[11px] mt-1.5 text-text-muted">Visible on the leaderboard and your public profile.</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-text-secondary tracking-widest uppercase mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="trader@example.com"
                className="w-full bg-bg border border-default px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-text-secondary tracking-widest uppercase mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Min. 6 characters"
                className="w-full bg-bg border border-default px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-text-secondary tracking-widest uppercase mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat password"
                className="w-full bg-bg border border-default px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {error && (
              <div className="text-loss text-xs bg-loss/10 border border-loss/20 px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'}
              className="w-full bg-accent text-bg font-bold text-xs tracking-widest uppercase py-3 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-text-muted text-xs mt-6 text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
