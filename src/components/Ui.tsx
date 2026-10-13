import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect } from 'react'
import { cx } from '../lib/cx'

export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#3aa0ff" />
      <path d="M17.2 3.5 7.5 17.2h6.2L12.2 28.5 24.8 13.6h-6.4L17.2 3.5Z" fill="#07131f" />
    </svg>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'bg-lime text-ink hover:bg-[#78c0ff]',
        variant === 'ghost' && 'border border-white/15 bg-white/5 text-paper hover:bg-white/10',
        className,
      )}
      {...props}
    />
  )
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-full px-3 py-1.5 text-xs font-semibold',
        active ? 'bg-lime text-ink' : 'bg-white/5 text-mist hover:bg-white/10',
      )}
    >
      {children}
    </button>
  )
}

export function StatusDot({ status }: { status: 'available' | 'charging' | 'offline' }) {
  return (
    <span
      className={cx(
        'inline-block h-2 w-2 rounded-full',
        status === 'available' && 'bg-lime',
        status === 'charging' && 'bg-orange-400',
        status === 'offline' && 'bg-white/30',
      )}
    />
  )
}

export function statusLabel(status: 'available' | 'charging' | 'offline') {
  if (status === 'available') return 'Available'
  if (status === 'charging') return 'In use'
  return 'Offline'
}

export function SplitBar({
  you,
  operator,
  holders,
  sale,
  youLabel = 'You',
}: {
  you: number
  operator: number
  holders: number
  sale: number
  youLabel?: string
}) {
  const parts = [
    { label: youLabel, value: you, color: '#3aa0ff' },
    { label: 'Operator', value: operator, color: '#d5deea' },
    { label: 'Holders', value: holders, color: '#c4b5fd' },
    { label: 'For sale', value: sale, color: 'rgba(255,255,255,0.28)' },
  ].filter((part) => part.value > 0.05)
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
        {parts.map((part) => (
          <div key={part.label} style={{ width: `${(part.value / total) * 100}%`, background: part.color }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-mist">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: part.color }} />
            {part.label} {Math.round(part.value)}%
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className={cx('card max-h-[90vh] w-full overflow-auto p-5', wide ? 'max-w-lg' : 'max-w-md')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  action,
}: {
  eyebrow?: string
  title: string
  lede?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-lime">{eyebrow}</div>}
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {lede && <p className="mt-2 text-sm leading-relaxed text-mist sm:text-base">{lede}</p>}
      </div>
      {action}
    </div>
  )
}
