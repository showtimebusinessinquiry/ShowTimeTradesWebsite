import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-surface/30">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

          {/* Follow Us */}
          <div>
            <div className="font-display font-extrabold text-base tracking-tight text-text-primary mb-1">
              Show<span className="text-accent">Time</span> Trades
            </div>
            <div className="font-display font-bold text-sm text-text-primary mb-4">Follow Us</div>
            <div className="flex gap-3">
              {/* Instagram */}
              <a href="https://www.instagram.com/showtime.trades/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="w-10 h-10 flex items-center justify-center rounded border border-border/60 bg-surface2 text-text-muted hover:text-accent hover:border-accent/50 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                </svg>
              </a>
              {/* TikTok */}
              <a href="https://www.tiktok.com/@showtime.trades" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                className="w-10 h-10 flex items-center justify-center rounded border border-border/60 bg-surface2 text-text-muted hover:text-accent hover:border-accent/50 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
                </svg>
              </a>
              {/* YouTube */}
              <a href="https://www.youtube.com/@showtime.trades" target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                className="w-10 h-10 flex items-center justify-center rounded border border-border/60 bg-surface2 text-text-muted hover:text-accent hover:border-accent/50 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <div className="font-display font-bold text-sm text-text-primary mb-4">Explore</div>
            <ul className="space-y-3">
              <li><Link href="/" className="text-sm text-text-muted hover:text-text-primary transition-colors">Home</Link></li>
              <li><Link href="/about" className="text-sm text-text-muted hover:text-text-primary transition-colors">About Us</Link></li>
              <li><a href="mailto:showtimebusinessinquiry@gmail.com" className="text-sm text-text-muted hover:text-text-primary transition-colors">Contact Us</a></li>
              <li><Link href="/faq" className="text-sm text-text-muted hover:text-text-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <div className="font-display font-bold text-sm text-text-primary mb-4">Resources</div>
            <ul className="space-y-3">
              <li><Link href="/privacy-policy" className="text-sm text-text-muted hover:text-text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-of-use" className="text-sm text-text-muted hover:text-text-primary transition-colors">Terms of Use</Link></li>
              <li><Link href="/refund-policy" className="text-sm text-text-muted hover:text-text-primary transition-colors">Refund &amp; Liability Policy</Link></li>
              <li><Link href="/risk-disclosure" className="text-sm text-text-muted hover:text-text-primary transition-colors">Risk Disclosure Statement</Link></li>
            </ul>
          </div>

          {/* Partner */}
          <div>
            <div className="font-display font-bold text-sm text-text-primary mb-4">Partner</div>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-text-muted hover:text-text-primary transition-colors">Affiliate</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border/30 pt-8 text-center">
          <p className="text-xs text-text-muted">© 2024–2026 ShowTime Trades. All rights reserved.</p>
        </div>

      </div>
    </footer>
  )
}
