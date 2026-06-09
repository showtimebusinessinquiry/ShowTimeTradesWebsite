import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/ui/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Refund & Liability Policy — ShowTime Trades' }

export default function RefundPolicy() {
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
          <h1 className="font-display text-4xl font-bold tracking-tight mb-3">Refund &amp; Liability Policy</h1>
          <p className="text-xs text-text-muted">Last updated: June 1, 2026 · Effective: June 1, 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">

        <div className="border-l-2 border-accent/60 bg-surface/40 px-5 py-4 text-sm text-text-secondary leading-relaxed">
          This policy governs refunds and liability limitations for ShowTime Trades. By using the Service, you agree to the terms described below.
        </div>

        <Section title="1. Free Beta Period">
          <p>ShowTime Trades is currently offered free of charge during our beta period. No payment is required to access any feature of the platform. As a result, there are no charges to refund.</p>
          <p>We may transition to a paid model in the future. When that occurs, we will provide clear advance notice and publish updated pricing, billing, and refund terms before any charges are applied.</p>
        </Section>

        <Section title="2. Future Paid Plans — Refund Policy">
          <p>When paid subscription plans are introduced, the following refund policy will apply:</p>
          <BulletList items={[
            'Monthly Subscriptions — may cancel at any time; cancellation takes effect at the end of the current billing cycle; no prorated refunds for partial months',
            'Annual Subscriptions — full refund within 14 days of initial purchase if fewer than 10 trade entries have been logged; non-refundable after 14 days but remains active through the end of the paid period',
            'Service Outages — if the Service experiences unscheduled downtime exceeding 24 consecutive hours in a calendar month, paid subscribers may request a prorated credit',
            'Billing Errors — contact us within 60 days of an incorrect charge; confirmed errors will be refunded in full',
          ]} />
          <p>To request a refund, email <a href="mailto:billing@showtimejournal.com" className="text-accent hover:underline">billing@showtimejournal.com</a> with your account email and reason for the request.</p>
        </Section>

        <Section title="3. Non-Refundable Items">
          <BulletList items={[
            'Fees charged after a refund-eligible window has passed',
            'Charges resulting from violations of our Terms of Use',
            'Subscriptions that have been substantially used',
            'Promotional or discounted subscriptions unless otherwise specified in the offer terms',
          ]} />
        </Section>

        <Section title="4. Limitation of Liability — Platform Availability">
          <p>ShowTime Trades is provided on an "as available" basis. We do not guarantee continuous, uninterrupted access. ShowTime Trades shall not be liable for losses or damages arising from:</p>
          <BulletList items={[
            'Service interruptions, downtime, or unavailability of any duration',
            'Data loss resulting from system failures, bugs, or infrastructure issues',
            'Delays in data processing or analytics updates',
            'Inability to access the platform during critical trading windows',
          ]} />
          <p>We strongly recommend maintaining your own local backups using the platform's CSV export functionality.</p>
        </Section>

        <Section title="5. Limitation of Liability — Data & Calculations">
          <p>ShowTime Trades provides P&L calculations and performance metrics based solely on data you input. ShowTime Trades is not liable for:</p>
          <BulletList items={[
            'Trading or investment losses arising from reliance on platform metrics or analytics',
            'Errors in calculations resulting from incorrect data entered by the user',
            'Discrepancies between platform calculations and actual brokerage statements',
            'Tax filing errors or regulatory violations resulting from use of platform data',
          ]} />
        </Section>

        <Section title="6. Aggregate Liability Cap">
          <p>To the maximum extent permitted by applicable law, ShowTime Trades' total cumulative liability to you for all claims shall not exceed the greater of: (a) total fees you paid to ShowTime Trades during the 12-month period preceding the claim, or (b) one hundred U.S. dollars ($100.00).</p>
        </Section>

        <Section title="7. Chargebacks">
          <p>We ask that you contact us before initiating a chargeback with your bank or payment provider. We are committed to resolving disputes quickly and fairly. Initiating a chargeback without first contacting us may result in immediate account suspension.</p>
          <p>If a chargeback is found to be fraudulent, ShowTime Trades reserves the right to permanently ban the associated account and recover any costs incurred in disputing the chargeback.</p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>We may update this policy at any time. When transitioning from free to paid plans, we will provide at least 30 days' advance notice by email. Continued use of the Service after the effective date constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="9. Contact">
          <ContactBox title="ShowTime Trades" subtitle="Billing & Refunds" email="billing@showtimejournal.com" />
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
      <p className="text-text-muted text-xs">Response time: within 3 business days</p>
    </div>
  )
}
