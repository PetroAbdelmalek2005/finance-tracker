import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { formatCurrency } from '@/utils/formatters'
import { Button } from '@/components/ui/Button'
import { LIABILITY_TYPES } from '@/lib/constants'

export function AccountCard({ account, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  const isLiability = LIABILITY_TYPES.includes(account.type)
  const isUSD = account.currency === 'USD'

  return (
    <div className="flex items-center justify-between rounded-xl border border-surface-border bg-surface px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{account.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {account.type}
          </span>
          {isUSD && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              USD
            </span>
          )}
          {account.institution_name && (
            <span className="text-xs text-slate-400">{account.institution_name}</span>
          )}
        </div>
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-1.5">
        <span className={clsx(
          'text-sm font-semibold tabular-nums',
          isLiability ? 'text-red-600' : 'text-slate-900'
        )}>
          {formatCurrency(account.balance, account.currency)}
        </span>

        {!confirming ? (
          <>
            <button
              onClick={() => onEdit(account)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="danger" onClick={() => { onDelete(account.id); setConfirming(false) }}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
