import { clsx } from 'clsx'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-surface-border bg-surface p-4 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }) {
  return (
    <div className={clsx('mb-3 flex items-center justify-between', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={clsx('text-xs font-semibold uppercase tracking-wide text-slate-500', className)}>
      {children}
    </h3>
  )
}
