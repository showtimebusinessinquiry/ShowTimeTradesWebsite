'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { TickerBanner } from '@/components/ui/TickerBanner'
import { FeedbackButton } from '@/components/ui/FeedbackButton'

const NAV_ITEMS = [
  {
    href: '/dashboard', label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
        <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/log', label: 'Trade Log',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="10" y2="12"/>
      </svg>
    ),
  },
  {
    href: '/wheel', label: 'Wheel',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 8A6 6 0 1 1 8 2h2.5"/><polyline points="8.5 1 11.5 3.5 8.5 6"/>
      </svg>
    ),
  },
  {
    href: '/portfolio', label: 'Portfolio',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1.5" y1="14.5" x2="14.5" y2="14.5"/>
        <rect x="1.5" y="9" width="3" height="5.5" rx="0.5"/><rect x="6.5" y="5" width="3" height="9.5" rx="0.5"/><rect x="11.5" y="1.5" width="3" height="13" rx="0.5"/>
      </svg>
    ),
  },
  {
    href: '/watchlist', label: 'Watchlist',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/>
      </svg>
    ),
  },
  {
    href: '/calendar', label: 'Calendar',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="14" height="11" rx="1.5"/>
        <line x1="1" y1="7" x2="15" y2="7"/><line x1="5" y1="1" x2="5" y2="5"/><line x1="11" y1="1" x2="11" y2="5"/>
      </svg>
    ),
  },
  {
    href: '/leaderboard', label: 'Leaderboard',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="14.5" x2="15" y2="14.5"/>
        <rect x="1" y="8" width="4" height="6.5" rx="0.5"/><rect x="6" y="4.5" width="4" height="10" rx="0.5"/><rect x="11" y="10" width="4" height="4.5" rx="0.5"/>
      </svg>
    ),
  },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, username, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const isExpanded = sidebarOpen || sidebarHovered

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-accent text-sm animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-surface border-b border-default/60 flex items-center justify-between px-6 flex-shrink-0">
        <Link href="/dashboard" className="font-display font-extrabold text-sm tracking-widest uppercase hover:opacity-80 transition-opacity">
          Show<span className="text-accent">Time</span>
          <span className="text-text-muted font-mono font-normal text-[10px] ml-3 tracking-[0.2em] normal-case">Journal</span>
        </Link>
        <div className="flex items-center gap-5">
          <span className="text-text-muted text-xs font-mono hidden sm:block">
              {username ? `@${username}` : user.email}
            </span>
          <Link
            href="/settings"
            className="text-xs text-text-muted hover:text-text-primary transition-colors tracking-wide"
          >
            Settings
          </Link>
          <button
            onClick={async () => { await signOut(); router.push('/') }}
            className="text-xs text-text-muted hover:text-loss transition-colors tracking-wide"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Ticker Banner */}
      <TickerBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          className={`${isExpanded ? 'w-52' : 'w-14'} bg-surface border-r border-default/60 flex-shrink-0 flex flex-col py-4 gap-0.5 transition-all duration-200 overflow-hidden`}
        >
          {/* Collapse toggle */}
          <div className="mx-2 mb-2">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface2 transition-colors text-sm"
            >
              <span className="text-base leading-none flex-shrink-0 font-mono">{sidebarOpen ? '«' : '»'}</span>
              {isExpanded && <span className="text-xs tracking-wider uppercase font-semibold">{sidebarOpen ? 'Collapse' : 'Pin'}</span>}
            </button>
          </div>

          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              title={!isExpanded ? item.label : undefined}
              className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                pathname === item.href
                  ? 'text-accent bg-gradient-to-r from-accent/15 to-accent/[0.03] shadow-[inset_3px_0_0_#ff3333,0_1px_16px_rgba(255,51,51,0.08)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-gradient-to-r hover:from-surface2 hover:to-surface2/40 hover:shadow-[0_1px_8px_rgba(0,0,0,0.3)]'
              }`}
            >
              <span className="flex-shrink-0" style={{ opacity: pathname === item.href ? 1 : 0.55 }}>{item.icon}</span>
              {isExpanded && <span className="truncate tracking-wide">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <FeedbackButton />
    </div>
  )
}
