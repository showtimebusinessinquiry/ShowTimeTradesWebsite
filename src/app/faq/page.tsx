import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/ui/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'FAQ — ShowTime Trades' }

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary font-mono">

      <nav className="sticky top-0 z-50 border-b border-border/50 bg-bg/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-display font-extrabold text-sm tracking-widest uppercase">
            <Image src="/logo.png" alt="ShowTime Trades" width={40} height={40} className="mix-blend-screen" />
            Show<span className="text-accent">Time</span>
            <span className="text-text-primary font-mono font-normal text-[11px] tracking-[0.2em] normal-case">Trades</span>
          </Link>
          <Link href="/" className="text-xs text-text-muted hover:text-text-primary transition-colors tracking-wide">← Back to Home</Link>
        </div>
      </nav>

      <div className="border-b border-border/40 bg-surface/40 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] tracking-[0.25em] uppercase text-accent mb-3 flex items-center gap-2">
            <span className="w-5 h-px bg-accent inline-block" /> Support
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight mb-3">Frequently Asked Questions</h1>
          <p className="text-xs text-text-muted">Answers to common questions about ShowTime Trades.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="border border-border/40 bg-surface/40 rounded-xl px-8 py-16 space-y-4">
          <div className="text-[10px] tracking-[0.25em] uppercase text-accent">Coming Soon</div>
          <p className="text-text-secondary text-sm leading-relaxed max-w-md mx-auto">
            We're putting together answers to the most common questions. Check back soon — or reach out to us directly in the Discord.
          </p>
          <a
            href="https://discord.com/invite/showtimetrades"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm text-accent hover:underline"
          >
            Join the Discord →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  )
}
