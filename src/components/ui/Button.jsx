import { forwardRef } from 'react'
import { clsx } from 'clsx'

const variants = {
  primary:   'bg-brand-500 text-white hover:bg-brand-600 focus-visible:ring-brand-500',
  secondary: 'bg-surface border border-surface-border text-slate-700 hover:bg-slate-50',
  ghost:     'text-slate-600 hover:bg-slate-100',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
