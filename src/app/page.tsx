import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/ui/Footer'

const FEATURES = [
  {
    tag: 'CORE',
    title: 'Wheel Cycle Tracker',
    desc: 'Full lifecycle from CSP entry through assignment to covered call close. Every leg linked, every metric live.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke="#ff3333" strokeWidth="1.5" />
        <circle cx="11" cy="11" r="2.5" fill="#ff3333" />
        <path d="M11 3v2.5M11 16.5V19M3 11h2.5M16.5 11H19" stroke="#ff3333" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tag: 'LOG',
    title: 'Trade Journal',
    desc: 'Complete history with realized P&L, strategy, DTE at entry, and return on capital — filterable and sortable.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="16" height="16" rx="2.5" stroke="#ff3333" strokeWidth="1.5" />
        <path d="M7 8h8M7 11h8M7 14h5" stroke="#ff3333" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tag: 'ANALYTICS',
    title: 'Portfolio Analytics',
    desc: 'Win rate, profit factor, max drawdown, and avg ROC computed automatically from every trade you log.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 15l4-5 3.5 3.5 4.5-6L19 11" stroke="#ff3333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 19h16" stroke="#ff3333" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tag: 'LIVE',
    title: 'Live Market Data',
    desc: 'Real-time prices, option marks, % OTM, and implied volatility on every active cycle — always current.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="2.5" fill="#ff3333" />
        <path d="M7 15A6 6 0 0 1 7 7" stroke="#ff3333" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15 7A6 6 0 0 1 15 15" stroke="#ff3333" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4.5 17.5A10 10 0 0 1 4.5 4.5" stroke="#ff3333" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17.5 4.5A10 10 0 0 1 17.5 17.5" stroke="#ff3333" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

const STEPS = [
  { n: '01', title: 'Sell the CSP', desc: 'Log your cash-secured put — ticker, strike, expiration, premium. DTE is auto-calculated.' },
  { n: '02', title: 'Monitor Live', desc: 'Track price vs. strike, current option mark, and % of max profit captured on every active card.' },
  { n: '03', title: 'Log Assignment', desc: 'If assigned, one click records it and opens your CC phase with cost basis pre-filled.' },
  { n: '04', title: 'Sell the CC', desc: 'Log your covered call and track to expiration. Full cycle P&L tallied when you close.' },
]

const PREMIER_PERKS = [
  { icon: '◈', text: "ShowTime's live trade setups — CSPs, CCs, and adjustments as they happen" },
  { icon: '◉', text: 'Private Discord with a community of serious Wheel traders' },
  { icon: '◎', text: 'Weekly watchlist: tickers ShowTime is targeting and why' },
  { icon: '⟐', text: 'Direct access to ask questions and get real trade feedback' },
]

const HERO_STATS = [
  { label: 'Win Rate', value: '87%', color: '#00e676' },
  { label: 'YTD Premium', value: '+$4,320', color: '#00e676' },
  { label: 'Avg ROC', value: '2.84%', color: '#ff3333' },
  { label: 'Active Cycles', value: '3', color: '#dce4f2' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary font-sans overflow-x-hidden">

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-default/50 bg-bg/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-display font-extrabold text-sm tracking-widest uppercase">
            <Image src="/logo.png" alt="ShowTime Trades" width={36} height={36} className="mix-blend-screen" />
            <span>Show<span className="text-accent">Time</span></span>
            <span className="text-text-muted font-mono font-normal text-[10px] tracking-[0.2em] normal-case">Trades</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-text-muted hover:text-text-primary transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <a
              href="https://whop.com/joined/showtime-trades/products/showtime-s-premier-access/"
              target="_blank" rel="noopener noreferrer"
              className="text-sm font-semibold text-stone-900 px-4 py-1.5 rounded-lg transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #c8960c, #ffd700, #fff3a0, #ffd700, #c8960c)', boxShadow: '0 0 14px rgba(255,215,0,0.3)' }}
            >
              ★ Premier
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background grid + glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 10% 0%, rgba(255,51,51,0.09) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 80% 80%, rgba(20,40,120,0.07) 0%, transparent 60%),
            repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(28,38,64,0.35) 59px, rgba(28,38,64,0.35) 60px),
            repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(28,38,64,0.35) 59px, rgba(28,38,64,0.35) 60px)
          `
        }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-28">
          <div className="grid lg:grid-cols-[1fr_440px] gap-16 items-center">

            {/* Copy */}
            <div>
              <div className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-text-muted uppercase mb-7 border border-default/60 rounded-full px-3.5 py-1.5 bg-surface/60 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse-glow" />
                Free to use · No credit card
              </div>

              <h1 className="font-display font-extrabold leading-[1.0] tracking-tight mb-6" style={{ fontSize: 'clamp(2.6rem, 6vw, 4rem)' }}>
                The Wheel deserves<br />
                better than{' '}
                <span style={{
                  background: 'linear-gradient(90deg, #ff3333, #ff7066)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  a spreadsheet.
                </span>
              </h1>

              <p className="text-base text-text-secondary leading-relaxed mb-4 max-w-lg">
                ShowTime Trades is a free journal built specifically for Wheel strategy traders. Log every CSP, assignment, and covered call — then join{' '}<span className="text-text-primary font-medium">Premier</span>{' '}to follow ShowTime&apos;s live setups and trade alongside a serious community.
              </p>

              {/* CTA row */}
              <div className="flex flex-wrap gap-3 mt-8">
                <a
                  href="https://whop.com/joined/showtime-trades/products/showtime-s-premier-access/"
                  target="_blank" rel="noopener noreferrer"
                  className="relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg font-bold tracking-wide text-stone-900 transition-all hover:brightness-110 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, #c8960c 0%, #ffd700 35%, #fff3a0 50%, #ffd700 65%, #c8960c 100%)',
                    boxShadow: '0 0 28px rgba(255,215,0,0.5), 0 0 60px rgba(255,215,0,0.15), inset 0 1px 0 rgba(255,255,255,0.35)',
                    fontSize: '0.9rem',
                  }}
                >
                  <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-lg pointer-events-none" />
                  <span className="relative">★ Join Premier</span>
                </a>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-surface border border-default/80 text-text-primary hover:border-text-muted/60 hover:bg-surface2 transition-all rounded-lg px-6 py-3.5 font-medium tracking-wide"
                  style={{ fontSize: '0.9rem' }}
                >
                  Start free →
                </Link>
                <a
                  href="https://discord.com/invite/showtimetrades"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-3.5 font-medium tracking-wide border border-[#5865f2]/40 bg-[#5865f2]/8 text-[#7b8af5] hover:bg-[#5865f2]/15 hover:border-[#5865f2]/70 transition-all"
                  style={{ fontSize: '0.9rem' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
                  </svg>
                  Discord
                </a>
              </div>
            </div>

            {/* Live stats panel */}
            <div className="hidden lg:block">
              <div className="rounded-2xl border border-default/60 bg-surface/80 backdrop-blur-sm overflow-hidden"
                style={{ boxShadow: '0 0 60px rgba(255,51,51,0.06), 0 24px 60px rgba(0,0,0,0.5)' }}>
                {/* Terminal bar */}
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-default/60 bg-surface2/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-loss/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-gain/70" />
                  <span className="font-mono text-[10px] text-text-muted ml-2 tracking-wide">dashboard.tsx</span>
                  <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] text-gain/80 tracking-wider">
                    <span className="w-1 h-1 rounded-full bg-gain animate-pulse-glow" />
                    LIVE
                  </span>
                </div>
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-px bg-border/20">
                  {HERO_STATS.map(({ label, value, color }) => (
                    <div key={label} className="bg-surface p-5">
                      <div className="font-mono text-[9px] tracking-[0.2em] text-text-muted uppercase mb-2">{label}</div>
                      <div className="font-mono font-bold text-2xl tracking-tight" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
                {/* Screenshot preview */}
                <div className="relative overflow-hidden" style={{ height: 160 }}>
                  <Image
                    src="/screenshots/wheel.png"
                    alt="Wheel cycle tracker"
                    width={440} height={200}
                    className="w-full object-cover object-top opacity-60"
                    style={{ height: 160 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Proof strip ──────────────────────────────────────────────── */}
      <div className="border-y border-default/40 bg-surface/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-8">
          {[
            { val: '100%', label: 'Free to use' },
            { val: '4', label: 'Core tools' },
            { val: 'Live', label: 'Market data' },
            { val: '★', label: 'Premier community' },
          ].map(({ val, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-sm text-text-primary">{val}</span>
              <span className="text-xs text-text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two ways in ──────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="font-mono text-[10px] tracking-[0.22em] text-text-muted uppercase mb-3">What you get</div>
          <h2 className="font-display font-extrabold text-3xl tracking-tight">Two ways to get an edge.</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Free tier */}
          <div className="rounded-2xl border border-default/60 bg-surface p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-border/80 via-border/20 to-transparent" />
            <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase mb-1">Free forever</div>
            <h3 className="font-display font-bold text-2xl mb-4">The App</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              A structured journal built around the Wheel. Log every leg, track every cycle, and measure your performance automatically.
            </p>
            <ul className="space-y-2.5 mb-8">
              {['Wheel Cycle Tracker — CSP → Assignment → CC', 'Complete Trade Log with P&L and DTE', 'Portfolio Analytics — win rate, ROC, drawdown', 'Live prices and option marks on every card', 'Calendar & Watchlist'].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <span className="text-gain mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 w-full justify-center bg-surface2 border border-default/80 hover:border-text-muted/50 text-text-primary transition-all rounded-xl px-6 py-3 font-semibold tracking-wide text-sm"
            >
              Create free account →
            </Link>
          </div>

          {/* Premier tier */}
          <div className="rounded-2xl border overflow-hidden relative"
            style={{
              borderColor: 'rgba(255,215,0,0.3)',
              background: 'linear-gradient(160deg, #0d1120 0%, #0f1318 100%)',
              boxShadow: '0 0 40px rgba(255,215,0,0.08), 0 0 80px rgba(255,215,0,0.03)',
            }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.6), rgba(255,215,0,0.3), transparent)' }} />
            <div className="p-8">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] tracking-[0.2em] text-amber uppercase">Premier</span>
                <span className="font-mono text-[9px] tracking-wider text-amber/60 border border-amber/30 rounded px-1.5 py-0.5">PAID</span>
              </div>
              <h3 className="font-display font-bold text-2xl mb-4" style={{ color: '#ffd700' }}>Follow the Plays</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                The app shows you what <em>you</em> are doing. Premier shows you what <span className="text-text-primary font-medium">ShowTime</span> is doing — every setup, every adjustment, every week.
              </p>
              <ul className="space-y-2.5 mb-8">
                {PREMIER_PERKS.map(({ icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <span className="text-amber mt-0.5 shrink-0 text-xs">{icon}</span>
                    {text}
                  </li>
                ))}
              </ul>
              <a
                href="https://whop.com/joined/showtime-trades/products/showtime-s-premier-access/"
                target="_blank" rel="noopener noreferrer"
                className="relative inline-flex items-center gap-2 w-full justify-center rounded-xl px-6 py-3.5 font-bold tracking-wide text-stone-900 transition-all hover:brightness-110"
                style={{
                  background: 'linear-gradient(135deg, #c8960c 0%, #ffd700 35%, #fff3a0 50%, #ffd700 65%, #c8960c 100%)',
                  boxShadow: '0 0 24px rgba(255,215,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
              >
                <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl pointer-events-none" />
                <span className="relative text-sm">★ Join Premier</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="border-t border-default/40 bg-surface/20">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="mb-12">
            <div className="font-mono text-[10px] tracking-[0.22em] text-text-muted uppercase mb-3">The Tool</div>
            <h2 className="font-display font-extrabold text-3xl tracking-tight">Everything the Wheel needs.</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon, title, desc, tag }) => (
              <div key={title} className="relative rounded-2xl border border-default/50 bg-surface p-6 overflow-hidden hover:border-accent/30 transition-colors group">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-accent/40 via-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between mb-5">
                  {icon}
                  <span className="font-mono text-[9px] tracking-[0.18em] text-text-muted border border-default/50 rounded px-1.5 py-0.5">{tag}</span>
                </div>
                <h3 className="font-semibold text-text-primary mb-2 text-sm">{title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Dashboard screenshot */}
          <div className="mt-10 rounded-2xl border border-default/40 overflow-hidden bg-bg"
            style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            <div className="px-4 py-3 border-b border-default/40 flex items-center gap-1.5 bg-surface">
              <span className="w-2.5 h-2.5 rounded-full bg-loss/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-gain/60" />
              <span className="font-mono text-[10px] text-text-muted ml-2 tracking-wide">showtime-trades.vercel.app/dashboard</span>
            </div>
            <Image src="/screenshots/dashboard.png" alt="Dashboard" width={1200} height={500}
              className="w-full object-cover object-top opacity-75" style={{ height: 280 }} />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-default/40">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="mb-12">
            <div className="font-mono text-[10px] tracking-[0.22em] text-text-muted uppercase mb-3">Process</div>
            <h2 className="font-display font-extrabold text-3xl tracking-tight">The Wheel, step by step.</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/20 rounded-2xl overflow-hidden border border-default/40">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="bg-bg p-7 relative group hover:bg-surface/40 transition-colors">
                <div className="font-mono text-[4rem] font-bold leading-none mb-5 tracking-tight transition-colors duration-200 text-accent/20 group-hover:text-accent/40"
                >
                  {n}
                </div>
                <h3 className="font-semibold text-text-primary mb-2 text-sm">{title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Premier spotlight ─────────────────────────────────────────── */}
      <section className="border-t border-default/40 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(ellipse 70% 80% at 50% 50%, rgba(255,215,0,0.04) 0%, transparent 70%)`
        }} />
        <div className="relative max-w-6xl mx-auto px-6 py-28 text-center">
          <div className="font-mono text-[10px] tracking-[0.22em] mb-4" style={{ color: 'rgba(255,215,0,0.6)' }}>PREMIER MEMBERSHIP</div>
          <h2 className="font-display font-extrabold tracking-tight mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}>
            Don&apos;t just track your trades.<br />
            <span style={{ background: 'linear-gradient(90deg, #c8960c, #ffd700, #fff3a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Follow the ones that matter.
            </span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
            Premier members get access to ShowTime&apos;s live trade analysis — every cash-secured put, every covered call, every adjustment. Watch real positions being managed in real time, inside a private community of traders doing the same.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {PREMIER_PERKS.map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-full border"
                style={{ borderColor: 'rgba(255,215,0,0.2)', background: 'rgba(255,215,0,0.04)', color: '#b8a060' }}>
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <a
            href="https://whop.com/joined/showtime-trades/products/showtime-s-premier-access/"
            target="_blank" rel="noopener noreferrer"
            className="relative inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold tracking-wide text-stone-900 transition-all hover:brightness-110 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #c8960c 0%, #ffd700 35%, #fff3a0 50%, #ffd700 65%, #c8960c 100%)',
              boxShadow: '0 0 40px rgba(255,215,0,0.45), 0 0 80px rgba(255,215,0,0.12), inset 0 1px 0 rgba(255,255,255,0.35)',
              fontSize: '1rem',
            }}
          >
            <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-xl pointer-events-none" />
            <span className="relative">★ Join Premier Now</span>
          </a>
          <p className="text-xs text-text-muted mt-4">Or <Link href="/signup" className="underline underline-offset-2 hover:text-text-secondary transition-colors">start free</Link> with just the journal.</p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="border-t border-default/40 bg-surface/20">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="font-mono text-[10px] tracking-[0.22em] text-text-muted uppercase mb-4">Get started</div>
          <h2 className="font-display font-extrabold text-2xl mb-3 tracking-tight">Ready to run the Wheel with discipline?</h2>
          <p className="text-text-secondary mb-8 max-w-sm mx-auto text-sm leading-relaxed">
            Free journal. Log your first trade today.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff4444] to-[#ff7066] text-bg px-7 py-3 rounded-xl font-semibold tracking-wide text-sm btn-glow transition-all hover:brightness-110">
              Create free account
            </Link>
            <a href="https://discord.com/invite/showtimetrades" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-medium tracking-wide border border-[#5865f2]/40 bg-[#5865f2]/8 text-[#7b8af5] hover:bg-[#5865f2]/15 transition-all">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
              </svg>
              Join Discord
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
