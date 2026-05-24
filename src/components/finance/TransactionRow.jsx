import { clsx } from 'clsx'
import { ArrowLeftRight } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'

function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function TransactionRow({ tx, accountName, onClick }) {
  const isTransfer = tx.type === 'transfer'
  const isIncome   = tx.type === 'income'
  const isExpense  = tx.type === 'expense' || tx.type === 'bill'

  return (
    <button
      onClick={() => onClick?.(tx)}
      className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 rounded-lg"
    >
      <div className="flex min-w-0 items-center gap-3">
        {isTransfer && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
            <ArrowLeftRight className="h-3.5 w-3.5 text-slate-500" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{tx.description}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-xs text-slate-400">{fmtDate(tx.date)}</span>
            <span className="text-slate-300">·</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-px text-xs text-slate-500">
              {tx.category}
            </span>
            {accountName && (
              <>
                <span className="text-slate-300">·</span>
                <span className="truncate text-xs text-slate-400">{accountName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <span className={clsx(
        'ml-4 shrink-0 text-sm font-semibold tabular-nums',
        isIncome   && 'text-emerald-600',
        isExpense  && 'text-red-500',
        isTransfer && 'text-slate-500',
      )}>
        {isIncome ? '+' : isExpense ? '−' : ''}{formatCurrency(tx.amount)}
      </span>
    </button>
  )
}
