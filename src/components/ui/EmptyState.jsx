import { clsx } from 'clsx'

export function EmptyState({ icon: Icon, heading, sub, className }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-14 text-center', className)}>
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Icon className="h-5 w-5 text-slate-400" />
        </div>
      )}
      <p className="text-sm font-medium text-slate-700">{heading}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}
