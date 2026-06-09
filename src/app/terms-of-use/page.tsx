import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/ui/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Use — ShowTime Trades' }

export default function TermsOfUse() {
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
          <h1 className="font-display text-4xl font-bold tracking-tight mb-3">Terms of Use</h1>
          <p className="text-xs text-text-muted">Last updated: June 1, 2026 · Effective: June 1, 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">

        <div className="border-l-2 border-accent/60 bg-surface/40 px-5 py-4 text-sm text-text-secondary leading-relaxed">
          Please read these Terms of Use carefully before using ShowTime Trades. By accessing or using the platform, you agree to be bound by these terms. If you do not agree, do not use the service.
        </div>

        <Section title="1. Acceptance of Terms">
          <p>These Terms of Use ("Terms") constitute a legally binding agreement between you and ShowTime Trades ("we," "us," or "our"), governing your access to and use of our platform and all associated services.</p>
          <p>By creating an account or using the Service, you represent that you are at least 18 years of age and have the legal capacity to enter into this agreement.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>ShowTime Trades is a trade journaling and performance analytics platform designed for individual traders. The Service allows users to:</p>
          <BulletList items={[
            'Log and track trades across equities, options, futures, and other instruments',
            'View performance analytics, P&L metrics, win rates, and risk-adjusted returns',
            'Maintain a portfolio overview and positions watchlist',
            'Store trade notes, tags, and strategy documentation',
          ]} />
          <p>ShowTime Trades is a journaling tool only. It is not a brokerage, investment advisor, or financial planning service. It does not execute trades, manage accounts, or provide personalized financial advice.</p>
        </Section>

        <Section title="3. Account Registration & Security">
          <p>To access most features, you must register for an account. You agree to:</p>
          <BulletList items={[
            'Provide accurate, current, and complete information during registration',
            'Keep your password confidential and not share it with any third party',
            'Notify us immediately of any unauthorized use of your account',
            'Accept responsibility for all activity that occurs under your account',
          ]} />
          <p>We reserve the right to suspend or terminate accounts that provide false information, violate these Terms, or engage in abusive conduct.</p>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You must not:</p>
          <BulletList items={[
            'Use the Service in any way that violates applicable laws or regulations',
            'Attempt to gain unauthorized access to any portion of the Service or related systems',
            'Use automated scripts, bots, or scraping tools to access or collect data',
            'Reverse engineer, decompile, or disassemble any portion of the Service',
            'Impersonate any person or entity',
            'Upload or distribute any malware, spyware, or other harmful code',
            'Use the Service to engage in market manipulation, fraud, or illegal trading activity',
            'Share, resell, or sublicense access to the Service without our express written consent',
          ]} />
        </Section>

        <Section title="5. User Content">
          <p>You retain full ownership of all trade data, notes, and other content you submit ("User Content"). By submitting User Content, you grant ShowTime Trades a limited, non-exclusive, royalty-free license to store and process it solely to provide the Service to you.</p>
          <p>You are solely responsible for the accuracy of the trade data you enter. ShowTime Trades does not verify trade data and is not responsible for errors in your records.</p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>All content comprising the ShowTime Trades platform — including software, code, UI, design, graphics, text, logos, and analytics algorithms — is owned by or licensed to ShowTime Trades and is protected by copyright, trademark, and other intellectual property laws.</p>
          <p>Nothing in these Terms grants you the right to use ShowTime Trades' trademarks, logos, or other proprietary designations without our express written permission.</p>
        </Section>

        <Section title="7. Beta Service">
          <p>The Service is currently in beta. You acknowledge that:</p>
          <BulletList items={[
            'Beta software may contain bugs, errors, and instabilities',
            'Features may change, be removed, or behave differently than documented',
            'Data may be lost or corrupted — we strongly recommend regular CSV exports',
            'We may discontinue the beta or transition to a paid model with notice',
          ]} />
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <p className="uppercase text-xs tracking-wide">The service is provided "as is" and "as available" without warranty of any kind. To the fullest extent permitted by applicable law, ShowTime Trades expressly disclaims all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, and that the service will be uninterrupted, error-free, or secure.</p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p className="uppercase text-xs tracking-wide">To the maximum extent permitted by applicable law, ShowTime Trades shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, trading losses, or investment losses arising from your use of the platform.</p>
          <p>In no event shall ShowTime Trades' total aggregate liability exceed the greater of (a) the total amount you paid to ShowTime Trades in the twelve months preceding the claim, or (b) one hundred dollars ($100).</p>
        </Section>

        <Section title="10. Indemnification">
          <p>You agree to indemnify, defend, and hold harmless ShowTime Trades and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising out of or related to your use of the Service, your User Content, or your violation of these Terms.</p>
        </Section>

        <Section title="11. Termination">
          <p>You may terminate your account at any time via account settings or by contacting us. We reserve the right to suspend or terminate your account for any reason, including violation of these Terms.</p>
          <p>Upon termination, your trade data will be available for export for 30 days, after which it will be deleted per our Privacy Policy.</p>
        </Section>

        <Section title="12. Governing Law & Dispute Resolution">
          <p>These Terms are governed by the laws of the State of Delaware, without regard to its conflict of law provisions. Any dispute shall be resolved by binding arbitration under AAA Consumer Arbitration Rules, except either party may seek injunctive relief in a court of competent jurisdiction in Delaware.</p>
          <p>You waive any right to participate in class action lawsuits or class-wide arbitrations against ShowTime Trades.</p>
        </Section>

        <Section title="13. Changes to Terms">
          <p>We may modify these Terms at any time. When we make material changes, we will notify you by email or by posting a prominent notice at least 14 days before the changes take effect. Continued use of the Service constitutes acceptance of the revised Terms.</p>
        </Section>

        <Section title="14. Contact">
          <ContactBox title="ShowTime Trades" subtitle="Legal Department" email="legal@showtimejournal.com" />
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
