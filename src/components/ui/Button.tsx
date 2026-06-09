interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}
export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'font-medium tracking-wide transition-all disabled:opacity-50 rounded-lg'
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2' }
  const variants = {
    primary: 'bg-gradient-to-r from-[#ff4444] to-[#ff7066] text-bg hover:brightness-110 btn-glow',
    secondary: 'bg-gradient-to-r from-surface2 to-surface border border-default text-text-secondary hover:text-text-primary hover:border-text-muted btn-glow-subtle',
    danger: 'bg-gradient-to-r from-loss/15 to-loss/5 border border-loss/40 text-loss hover:from-loss/25 hover:to-loss/10 btn-glow',
    ghost: 'text-text-muted hover:text-text-primary bg-transparent border-0',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
