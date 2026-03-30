import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, className, ...props }) {
  const variants = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger: 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl transition-all inline-flex items-center gap-2',
    gold: 'bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 text-gold-400 rounded-xl transition-all inline-flex items-center gap-2',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  }
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cn(variants[variant], sizes[size], 'font-display font-600', className, loading && 'opacity-60 cursor-not-allowed')}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label">{label}</label>}
      <input className={cn('input', error && 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/10', className)} {...props} />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, error, children, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label">{label}</label>}
      <select
        className={cn(
          'input appearance-none cursor-pointer',
          error && 'border-red-500/60',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea({ label, error, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label">{label}</label>}
      <textarea className={cn('input resize-none', error && 'border-red-500/60', className)} {...props} />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className, ...props }) {
  return (
    <div className={cn('card p-6', className)} {...props}>
      {children}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={size} className="animate-spin text-brand-500" />
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'muted' }) {
  const variants = {
    green: 'badge-green',
    gold: 'badge-gold',
    muted: 'badge-muted',
    red: 'badge-red',
  }
  return <span className={cn('badge', variants[variant])}>{children}</span>
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4">
          <Icon size={22} className="text-muted" />
        </div>
      )}
      <p className="font-display font-600 text-white text-sm mb-1">{title}</p>
      {description && <p className="text-xs text-muted max-w-xs">{description}</p>}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full card shadow-2xl shadow-black/60 overflow-hidden', maxWidth)}>
        {title && (
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-display font-700 text-white">{title}</h3>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, trend, color = 'green' }) {
  const colors = {
    green: 'text-brand-400 bg-brand-500/10',
    gold: 'text-gold-400 bg-gold-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  }
  return (
    <Card className="flex items-start gap-4">
      {Icon && (
        <div className={cn('p-2.5 rounded-xl flex-shrink-0', colors[color])}>
          <Icon size={18} className={colors[color].split(' ')[0]} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-muted uppercase tracking-wider font-display mb-1">{label}</p>
        <p className="font-display font-800 text-white text-2xl">{value ?? '—'}</p>
        {trend && <p className="text-xs text-ghost mt-0.5">{trend}</p>}
      </div>
    </Card>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="font-display font-700 text-white text-xl">{title}</h2>
        {subtitle && <p className="text-sm text-ghost mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
