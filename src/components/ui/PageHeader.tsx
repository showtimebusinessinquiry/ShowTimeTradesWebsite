interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-text-muted text-sm mt-2">{subtitle}</p>
        )}
      </div>
      {action && <div className="mt-0.5">{action}</div>}
    </div>
  )
}
