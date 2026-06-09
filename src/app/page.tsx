import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/ui/Footer'

const FEATURES = [
  {
    tag: 'CORE',
    title: 'Wheel Cycle Tracker',
    desc: 'Full lifecycle view from CSP entry through assignment to covered call close. Every leg linked, every metric calculated.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="2.5" fill="currentColor" />
        <path d="M10 3v2M10 15v2M3 10h2M15 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tag: 'LOG',
    title: 'Trade Log',
    desc: 'Complete trade history with realized P&L, strategy, DTE at entry, and return on capital — all in one filterable table.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 7h8M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tag: 'ANALYTICS',
    title: 'Portfolio Analytics',
    desc: 'Win rate, profit factor, max drawdown, and avg ROC computed automatically from your trade history.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
        <path d="M3 14l4-4 3 3 4-5 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tag: 'LIVE',
    title: 'Live Market Data',
    desc: 'Real-time prices, option marks, % OTM, and IV on every active cycle card — powered by Yahoo Finance.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
        <circle cx="10" cy="10" r="2" fill="currentColor" />
        <path d="M6.5 13.5A5 5 0 0 1 6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M13.5 6.5A5 5 0 0 1 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 16A8 8 0 0 1 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 4A8 8 0 0 1 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Sell the CSP',
    desc: 'Log your cash-secured put — ticker, strike, expiration, and premium. DTE is calculated automatically.',
  },
  {
    n: '02',
    title: 'Monitor or Close',
    desc: 'Track price vs. strike, current option mark, and % of max profit captured on every active cycle card.',
  },
  {
    n: '03',
    title: 'Log Assignment',
    desc: 'If assigned, record it in one click. The app opens your CC phase with cost basis pre-filled.',
  },
  {
    n: '04',
    title: 'Sell the CC',
    desc: 'Log your covered call and track it to expiration or close. Full cycle P&L is tallied when you close.',
  },
]

const HERO_STATS = [
  { label: 'Win Rate', value: '87%', sub: '52 closed legs', variant: 'gain' as const },
  { label: 'Avg ROC', value: '2.84%', sub: 'Per option leg', variant: 'accent' as const },
  { label: 'YTD Premium', value: '+$4,320', sub: 'All wheel legs', variant: 'gain' as const },
  { label: 'Active Cycles', value: '3', sub: 'NVDA · AAPL · MSFT', variant: 'default' as const },
]

const topLine: Record<string, string> = {
  gain: 'from-gain/60 via-gain/10 to-transparent',
  accent: 'from-accent/60 via-accent/10 to-transparent',
  default: 'from-border/80 via-border/20 to-transparent',
}

const valueColor: Record<string, string> = {
  gain: 'text-gain',
  accent: 'text-accent',
  default: 'text-text-primary',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary font-sans">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-default/50 bg-bg/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-display font-extrabold text-sm tracking-widest uppercase">
            <Image src="/logo.png" alt="ShowTime Trades" width={40} height={40} className="mix-blend-screen" />
            Show<span className="text-accent">Time</span>
            <span className="text-text-primary font-mono font-normal text-[11px] tracking-[0.2em] normal-case">Trades</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5">
              Log in
            </Link>
            <Link href="/signup" className="text-sm bg-gradient-to-r from-[#ff4444] to-[#ff7066] text-bg px-4 py-2 rounded-lg btn-glow hover:brightness-110 transition-all font-medium tracking-wide">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase mb-8 border border-default/60 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gain inline-block" />
              Free to use
            </div>
            <h1 className="text-5xl lg:text-[3.5rem] font-bold leading-[1.05] tracking-tight mb-6">
              The trading journal<br />
              built for the{' '}
              <span className="text-accent">Wheel.</span>
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed mb-10 max-w-md">
              Track every CSP, assignment, and covered call in one structured system.
              Stop losing track of your cycle. Start running it like a business.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff4444] to-[#ff7066] text-bg px-6 py-3 rounded-lg btn-glow hover:brightness-110 transition-all font-medium tracking-wide text-sm"
                >
                  Start for free
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-surface2 to-surface border border-default text-text-secondary hover:text-text-primary hover:border-text-muted btn-glow-subtle transition-all rounded-lg px-6 py-3 text-sm font-medium tracking-wide"
                >
                  See how it works
                  <span className="text-text-muted">↓</span>
                </a>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="https://whop.com/joined/showtime-trades/products/showtime-s-premier-access/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative inline-flex items-center gap-2 overflow-hidden rounded-lg px-6 py-3 text-sm font-semibold tracking-wide text-stone-900 transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #c8960c 0%, #ffd700 35%, #fff3a0 50%, #ffd700 65%, #c8960c 100%)', boxShadow: '0 0 18px rgba(255,215,0,0.45), inset 0 1px 0 rgba(255,255,255,0.4)' }}
                >
                  <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                  <span className="relative">★ Join Premier</span>
                </a>
                <a
                  href="https://discord.com/invite/showtimetrades"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium tracking-wide border border-[#5865f2]/50 bg-[#5865f2]/10 text-[#7b8af5] hover:bg-[#5865f2]/20 hover:border-[#5865f2]/80 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
                  </svg>
                  Free Discord
                </a>
              </div>
            </div>
          </div>

          {/* Decorative stats preview */}
          <div className="hidden lg:grid grid-cols-2 gap-3">
            {HERO_STATS.map(({ label, value, sub, variant }) => (
              <div key={label} className="relative rounded-xl border border-default/50 bg-surface p-5 overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${topLine[variant]}`} />
                <div className="text-[10px] font-semibold text-text-muted tracking-[0.14em] uppercase mb-3">{label}</div>
                <div className={`font-bold font-mono text-2xl tracking-tight leading-none ${valueColor[variant]}`}>{value}</div>
                <div className="text-xs text-text-muted mt-2">{sub}</div>
              </div>
            ))}
            <div className="col-span-2 rounded-xl border border-default/30 bg-surface/40 overflow-hidden">
              <Image
                src="/screenshots/wheel.png"
                alt="Wheel cycle tracker"
                width={640}
                height={240}
                className="w-full h-36 object-cover object-top opacity-70"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-default/40 bg-surface/20">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="mb-12">
            <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase mb-3">Features</div>
            <h2 className="text-3xl font-bold">Everything the Wheel needs.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon, title, desc, tag }) => (
              <div
                key={title}
                className="relative rounded-xl border border-default/50 bg-surface p-5 overflow-hidden hover:border-default/80 transition-colors"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-border/80 via-border/20 to-transparent" />
                <div className="flex items-start justify-between mb-4">
                  {icon}
                  <span className="font-mono text-[9px] tracking-[0.18em] text-text-muted border border-default/50 rounded px-1.5 py-0.5">
                    {tag}
                  </span>
                </div>
                <h3 className="font-semibold text-text-primary mb-2 text-sm">{title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* App screenshot strip */}
          <div className="mt-12 rounded-xl border border-default/40 overflow-hidden bg-surface/40">
            <div className="px-4 py-2 border-b border-default/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-border" />
              <span className="w-2 h-2 rounded-full bg-border" />
              <span className="w-2 h-2 rounded-full bg-border" />
              <span className="font-mono text-[10px] text-text-muted ml-2 tracking-wide">Dashboard</span>
            </div>
            <Image
              src="/screenshots/dashboard.png"
              alt="Dashboard overview"
              width={1200}
              height={500}
              className="w-full h-64 object-cover object-top opacity-80"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-default/40">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="mb-12">
            <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase mb-3">Process</div>
            <h2 className="text-3xl font-bold">The Wheel, step by step.</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/20 rounded-xl overflow-hidden border border-default/40">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="bg-bg p-6 relative group">
                <div className="font-mono text-5xl font-bold text-border/60 mb-4 leading-none group-hover:text-border transition-colors">
                  {n}
                </div>
                <h3 className="font-semibold text-text-primary mb-2 text-sm">{title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="border-t border-default/40 bg-surface/20">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase mb-4">Get started</div>
          <h2 className="text-3xl font-bold mb-4">Ready to run the Wheel with discipline?</h2>
          <p className="text-text-secondary mb-8 max-w-sm mx-auto text-sm leading-relaxed">
            Free to use. No credit card. Just log your first trade and see your cycle come together.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff4444] to-[#ff7066] text-bg px-8 py-3.5 rounded-lg btn-glow hover:brightness-110 transition-all font-medium tracking-wide"
          >
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />

    </div>
  )
}
