import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/ui/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — ShowTime Trades' }

export default function PrivacyPolicy() {
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
          <h1 className="font-display text-4xl font-bold tracking-tight mb-3">Privacy Policy</h1>
          <p className="text-xs text-text-muted">Last updated: June 1, 2026 · Effective: June 1, 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">

        <div className="border-l-2 border-accent/60 bg-surface/40 px-5 py-4 text-sm text-text-secondary leading-relaxed">
          This Privacy Policy describes how ShowTime Trades ("we," "us," or "our") collects, uses, and shares information about you when you use our platform. By using ShowTime Trades, you agree to the practices described in this policy.
        </div>

        <Section title="1. Information We Collect">
          <p><strong className="text-text-primary">Account Information.</strong> When you register, we collect your email address, username, and password (stored as a secure hash). You may optionally provide your name and profile details.</p>
          <p><strong className="text-text-primary">Trade Journal Data.</strong> We collect the trade data you enter — ticker symbols, position sizes, entry/exit prices, strategy types, P&L figures, notes, and tags. This data is yours; we store it to provide the service.</p>
          <p><strong className="text-text-primary">Usage Data.</strong> We automatically collect information about how you interact with the platform: pages visited, features used, session duration, and interaction patterns.</p>
          <p><strong className="text-text-primary">Device & Technical Data.</strong> We collect your IP address, browser type, operating system, and device identifiers when you access the platform.</p>
          <p><strong className="text-text-primary">Communications.</strong> If you contact us for support or send feedback, we retain those communications to respond and improve our service.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <BulletList items={[
            'Provide, operate, and maintain the ShowTime Trades platform and its features',
            'Process and display your trade journal entries, analytics, and performance metrics',
            'Send transactional emails (account confirmation, password resets, security alerts)',
            'Send product updates and feature announcements (you may opt out at any time)',
            'Analyze usage patterns to improve platform performance and usability',
            'Detect, prevent, and respond to fraud, abuse, and security threats',
            'Comply with applicable laws and legal obligations',
          ]} />
          <p>We do not sell your personal data or trade journal data to third parties. We do not use your trade data for any purpose other than providing the service to you.</p>
        </Section>

        <Section title="3. Information Sharing">
          <p>We share your information only in the following circumstances:</p>
          <BulletList items={[
            'Service Providers — trusted third-party vendors (cloud hosting, email delivery, analytics) who access data solely to perform services on our behalf',
            'Legal Requirements — if required by law, subpoena, or court order',
            'Business Transfers — if ShowTime Trades is involved in a merger or acquisition (we will notify you before your data is subject to a different policy)',
            'With Your Consent — when you have explicitly authorized it',
          ]} />
          <p>We do not share your personal information with advertisers or data brokers.</p>
        </Section>

        <Section title="4. Data Storage & Security">
          <p>Your data is stored on secure servers hosted by Supabase, with encryption in transit (TLS 1.2+) and at rest. Security measures include:</p>
          <BulletList items={[
            'Row-level security (RLS) ensuring users can only access their own data',
            'Hashed password storage using bcrypt',
            'Regular security audits and vulnerability assessments',
            'Access controls limiting employee access to production data',
          ]} />
          <p>No method of transmission over the internet is 100% secure. In the event of a data breach, we will notify you in accordance with applicable law.</p>
        </Section>

        <Section title="5. Cookies & Tracking Technologies">
          <p>We use cookies to maintain your authenticated session, remember your preferences, and analyze usage through aggregated analytics. We do not use third-party advertising cookies or cross-site tracking technologies.</p>
          <p>You may disable cookies through your browser settings, though this may affect core features such as staying logged in.</p>
        </Section>

        <Section title="6. Data Retention">
          <p>We retain your data for as long as your account is active. If you delete your account, your personal data will be deleted or anonymized within 30 days, except where required by law (typically up to 7 years for tax and audit purposes).</p>
        </Section>

        <Section title="7. Your Rights">
          <BulletList items={[
            'Access — request a copy of the personal data we hold about you',
            'Correction — request correction of inaccurate or incomplete data',
            'Deletion — request deletion of your personal data (subject to legal retention obligations)',
            'Portability — request your trade journal data in CSV format',
            'Opt-Out — unsubscribe from marketing emails at any time',
          ]} />
          <p>California residents may have additional rights under the CCPA. EU/EEA residents may have additional rights under the GDPR. Contact us to exercise any of these rights.</p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>ShowTime Trades is not directed to individuals under 18 years of age. We do not knowingly collect personal information from minors. If you believe we have inadvertently collected data from a minor, please contact us immediately.</p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email or by posting a prominent notice at least 14 days before the changes take effect.</p>
        </Section>

        <Section title="10. Contact Us">
          <ContactBox title="ShowTime Trades" subtitle="Privacy & Data Protection" email="privacy@showtimejournal.com" />
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
