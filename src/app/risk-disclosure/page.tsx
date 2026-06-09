import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/ui/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Risk Disclosure Statement — ShowTime Trades' }

export default function RiskDisclosure() {
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
            <span className="w-5 h-px bg-accent inline-block" /> Legal
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight mb-3">Risk Disclosure Statement</h1>
          <p className="text-xs text-text-muted">Last updated: June 1, 2026 · Effective: June 1, 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">

        <div className="border-l-2 border-amber/60 bg-amber/5 px-5 py-4 text-sm text-text-secondary leading-relaxed">
          <span className="block text-[10px] tracking-[0.2em] uppercase text-amber mb-2 font-semibold">Important Notice</span>
          Trading in financial instruments involves substantial risk of loss and is not appropriate for all investors. Past performance is not indicative of future results. You should carefully consider your investment objectives, level of experience, and risk appetite before engaging in any trading activity.
        </div>

        <div className="border-l-2 border-accent/60 bg-surface/40 px-5 py-4 text-sm text-text-secondary leading-relaxed">
          ShowTime Trades is a trade journaling and performance analytics tool. ShowTime Trades is <strong className="text-text-primary">NOT</strong> a registered investment advisor, broker-dealer, commodity trading advisor, or financial planner. Nothing on this platform constitutes financial advice, investment advice, trading advice, or any other form of professional advice.
        </div>

        <Section title="1. Not a Registered Investment Advisor">
          <p>ShowTime Trades has not registered with the U.S. Securities and Exchange Commission ("SEC") as an investment advisor under the Investment Advisers Act of 1940, nor with any state securities authority. ShowTime Trades is not a member of, nor registered with, FINRA, the NFA, or any other self-regulatory organization.</p>
          <p>Nothing communicated through ShowTime Trades — including performance analytics, win rate data, strategy labels, or any other metric — should be construed as a recommendation to buy, sell, hold, or otherwise transact in any security or financial instrument.</p>
          <p>Any decisions you make regarding your trading activity are solely your own. You should consult with a qualified, licensed financial professional before making any investment decisions.</p>
        </Section>

        <Section title="2. No Investment Advice">
          <p>All content, tools, data, analytics, and performance metrics provided by ShowTime Trades are for <strong className="text-text-primary">informational and journaling purposes only</strong>. Specifically:</p>
          <BulletList items={[
            'P&L calculations and risk metrics are derived solely from trade data you manually input and have not been verified against any brokerage record',
            'Strategy performance data reflects only the trades you have logged and is not comprehensive or representative of any strategy\'s market performance',
            'Watchlist and notation tools are for personal organizational purposes and do not constitute trading recommendations',
            'Any reference to specific securities, strategies, or instruments is for journaling context only',
          ]} />
        </Section>

        <Section title="3. General Market Risk">
          <BulletList items={[
            'Market Risk — the value of financial instruments can fluctuate rapidly and unpredictably; you may lose your entire investment',
            'Liquidity Risk — under certain market conditions, it may be difficult to liquidate a position at a reasonable price',
            'Volatility Risk — markets can experience extreme price swings in short periods; high volatility can lead to unexpected losses',
            'Systemic Risk — broad economic events and market-wide disruptions can affect all securities simultaneously',
            'Counterparty Risk — the failure of a broker, exchange, or clearinghouse could result in the loss of assets',
          ]} />
        </Section>

        <Section title="4. Options-Specific Risks">
          <BulletList items={[
            'Time Decay (Theta) — options lose value as expiration approaches; long options can expire worthless, resulting in total loss of premium paid',
            'Volatility Risk (Vega) — changes in implied volatility can significantly affect option pricing independent of the underlying asset',
            'Assignment Risk — short option positions are subject to early assignment at any time',
            'Unlimited Loss Potential — certain strategies (e.g., naked short calls) carry theoretically unlimited loss potential',
            'Leverage — options amplify both potential gains and potential losses relative to capital invested',
            'Pin Risk — options near their strike price at expiration create uncertainty about exercise or assignment',
          ]} />
          <p>The Options Clearing Corporation (OCC) publishes <em>Characteristics and Risks of Standardized Options</em>, which all options investors should read carefully before trading.</p>
        </Section>

        <Section title="5. Futures-Specific Risks">
          <BulletList items={[
            'Leverage Risk — a small adverse price move can result in losses exceeding your initial margin deposit',
            'Margin Calls — if your account falls below maintenance margin, you must deposit additional funds or positions will be liquidated',
            'Gap Risk — futures markets can gap through price levels, resulting in losses far greater than anticipated',
            'Rollover Risk — futures contracts expire; failure to roll may result in delivery obligations or forced liquidation',
          ]} />
          <p>Futures trading requires a futures account approved by a registered Futures Commission Merchant (FCM) and involves NFA/CFTC regulatory oversight separate from equity trading.</p>
        </Section>

        <Section title="6. Past Performance Disclaimer">
          <p>Any performance data, win rates, P&L figures, or metrics displayed within ShowTime Trades:</p>
          <BulletList items={[
            'Are not verified against actual brokerage statements or third-party records',
            'Do not account for slippage, commissions, fees, or taxes unless explicitly entered by you',
            'Do not represent live trading performance in real market conditions',
            'Are not necessarily representative of future results',
          ]} />
          <p><strong className="text-text-primary">Past performance, whether actual or simulated, is not indicative of future results.</strong> Strategies that have performed well historically can and do fail.</p>
        </Section>

        <Section title="7. Platform Calculation Accuracy">
          <p>While we strive to ensure accuracy of all calculations in ShowTime Trades, we make no guarantees that they are error-free or precisely match your brokerage records. Discrepancies may arise from user input errors, broker fee differences, rounding in multi-leg strategies, or currency conversion.</p>
          <p>You should always reconcile ShowTime Trades data against your official brokerage statements. ShowTime Trades is not liable for trading decisions made based on inaccurate data arising from input errors or platform calculation discrepancies.</p>
        </Section>

        <Section title="8. No Warranty of Suitability">
          <p>ShowTime Trades does not assess whether any trading strategy or activity is suitable for any specific individual. Before trading, you should:</p>
          <BulletList items={[
            'Understand the full risk profile of any instrument or strategy you intend to trade',
            'Only risk capital you can afford to lose entirely',
            'Consult a licensed financial advisor, tax professional, and/or attorney as appropriate',
            'Read all applicable exchange rules, OCC disclosures, broker agreements, and regulatory materials',
          ]} />
        </Section>

        <Section title="9. Tax Considerations">
          <p>Trading activity may have significant tax consequences, including capital gains taxes, wash sale rules, mark-to-market elections, and self-employment taxes. ShowTime Trades does not provide tax advice. Consult a qualified tax professional regarding the tax treatment of your trading activity.</p>
        </Section>

        <Section title="10. Regulatory Compliance">
          <p>It is your sole responsibility to comply with all applicable laws and regulations, including:</p>
          <BulletList items={[
            'Securities Exchange Act of 1934 and SEC regulations',
            'Commodity Exchange Act and CFTC regulations',
            'FINRA rules including pattern day trading (PDT) and margin requirements',
            'Applicable state and international securities laws',
            'Your broker\'s terms of service and margin agreements',
          ]} />
        </Section>

        <Section title="11. Limitation of Liability">
          <p className="uppercase text-xs tracking-wide">To the fullest extent permitted by applicable law, ShowTime Trades shall not be liable for any trading losses, investment losses, or financial damages of any kind arising from your use of the platform or any information, analytics, or data displayed thereon.</p>
          <p>This Risk Disclosure Statement is incorporated into and governed by ShowTime Trades' Terms of Use.</p>
        </Section>

        <Section title="12. Contact">
          <ContactBox title="ShowTime Trades" subtitle="Compliance & Legal" email="legal@showtimejournal.com" />
        </Section>

      </div>

      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-bold text-text-primary mb-4 pb-3 border-b border-border/40">{title}</h2>
      <div className="space-y-3 text-sm text-text-secondary leading-relaxed">{children}</div>
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 my-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-accent mt-0.5 shrink-0">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function ContactBox({ title, subtitle, email }: { title: string; subtitle: string; email: string }) {
  return (
    <div className="border border-border/40 bg-surface/40 p-6 mt-2 space-y-1">
      <p className="text-text-primary font-semibold">{title}</p>
      <p className="text-text-muted text-xs">{subtitle}</p>
      <p className="text-xs">Email: <a href={`mailto:${email}`} className="text-accent hover:underline">{email}</a></p>
      <p className="text-text-muted text-xs">Response time: within 5 business days</p>
    </div>
  )
}
