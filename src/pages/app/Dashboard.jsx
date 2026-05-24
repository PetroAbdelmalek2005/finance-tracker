import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFinanceStore } from '@/store/financeStore'
import {
  computeNetWorth,
  computeMonthlyIncome,
  computeMonthlySpending,
  computeSpendingByCategory,
} from '@/lib/selectors'
import { formatCurrency, getGreeting } from '@/utils/formatters'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { TransactionRow } from '@/components/finance/TransactionRow'
import { EmptyState } from '@/components/ui/EmptyState'

export default function Dashboard() {
  const { user }       = useAuth()
  const accounts       = useFinanceStore(s => s.accounts)
  const transactions   = useFinanceStore(s => s.transactions)
  const usdCadRate     = useFinanceStore(s => s.usdCadRate)

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0]

  const netWorth        = useMemo(() => computeNetWorth(accounts, usdCadRate), [accounts, usdCadRate])
  const monthlyIncome   = useMemo(() => computeMonthlyIncome(transactions), [transactions])
  const monthlySpending = useMemo(() => computeMonthlySpending(transactions), [transactions])
  const spendingByCat   = useMemo(() => computeSpendingByCategory(transactions), [transactions])

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.name]))

  const recentTx = transactions
    .filter(tx => tx.type !== 'transfer' || tx.xfer_dir === 'out')
    .slice(0, 10)

  const topCategories = Object.entries(spendingByCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const maxSpend = topCategories[0]?.[1] ?? 1

  const monthLabel = new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          {getGreeting()}, {displayName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here's your financial overview</p>
      </div>

      {/* CTA if no accounts */}
      {accounts.length === 0 && (
        <Card className="border-brand-200 bg-brand-50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-brand-900">Get started</p>
              <p className="mt-0.5 text-sm text-brand-700">
                Add your first account to see your net worth and track spending.
              </p>
            </div>
            <Link
              to="/accounts"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </Link>
          </div>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Net Worth</CardTitle></CardHeader>
          <p className="font-display text-2xl font-semibold text-slate-900">{formatCurrency(netWorth)}</p>
          <p className="mt-1 text-xs text-slate-400">
            Across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
          </p>
        </Card>
        <Card>
          <CardHeader><CardTitle>Income This Month</CardTitle></CardHeader>
          <p className="font-display text-2xl font-semibold text-emerald-600">{formatCurrency(monthlyIncome)}</p>
          <p className="mt-1 text-xs text-slate-400">{monthLabel}</p>
        </Card>
        <Card>
          <CardHeader><CardTitle>Spending This Month</CardTitle></CardHeader>
          <p className="font-display text-2xl font-semibold text-red-500">{formatCurrency(monthlySpending)}</p>
          <p className="mt-1 text-xs text-slate-400">{monthLabel}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <Link to="/transactions" className="text-xs font-medium text-brand-500 hover:text-brand-600">
              View all
            </Link>
          </CardHeader>
          {recentTx.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} heading="No transactions yet" />
          ) : (
            <div className="-mx-1 divide-y divide-slate-100">
              {recentTx.map(tx => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  accountName={accountMap[tx.account_id]}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Spending by category */}
        <Card>
          <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
          {topCategories.length === 0 ? (
            <EmptyState
              heading="No spending data"
              sub="Add expense transactions to see a breakdown."
            />
          ) : (
            <div className="space-y-3">
              {topCategories.map(([cat, amount]) => (
                <div key={cat}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-600">{cat}</span>
                    <span className="font-medium text-slate-900">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-300"
                      style={{ width: `${(amount / maxSpend) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
