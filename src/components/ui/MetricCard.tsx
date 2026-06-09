interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  variant?: 'default' | 'gain' | 'loss' | 'accent' | 'white'
  size?: 'default' | 'lg'
}
export function MetricCard({ label, value, sub, variant = 'default', size = 'default' }: MetricCardProps) {
  const valueColor = {
    default: 'text-text-primary',
    gain: 'text-gain',
    loss: 'text-loss',
    accent: 'text-accent',
    white: 'text-white',
  }[variant]

  const topLine = {
    default: 'from-border/80 via-border/20 to-transparent',
    gain: 'from-gain/60 via-gain/10 to-transparent',
    loss: 'from-loss/60 via-loss/10 to-transparent',
    accent: 'from-accent/60 via-accent/10 to-transparent',
    white: 'from-white/30 via-white/5 to-transparent',
  }[variant]

  const isLg = size === 'lg'

  return (
    <div className={`relative rounded-xl border overflow-hidden ${isLg ? 'bg-surface2 border-default/70 p-6' : 'bg-surface border-default/50 p-5'}`}>
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${topLine}`} />
      <div className="text-xs font-semibold text-text-muted tracking-[0.14em] uppercase mb-3">{label}</div>
      <div className={`font-bold font-mono tracking-tight leading-none ${isLg ? 'text-3xl' : 'text-2xl'} ${valueColor}`}>{value}</div>
      {sub && <div className={`text-xs text-text-muted leading-relaxed ${isLg ? 'mt-3' : 'mt-2'}`}>{sub}</div>}
    </div>
  )
}
