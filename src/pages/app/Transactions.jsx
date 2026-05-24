import { useState } from 'react'
import { ArrowLeftRight, Plus } from 'lucide-react'
import { useFinanceStore } from '@/store/financeStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { TransactionRow } from '@/components/finance/TransactionRow'
import { TransactionForm } from '@/components/finance/TransactionForm'
import { EXPENSE_CATS, INCOME_CATS, BILL_CATS, TRANSFER_CATS } from '@/lib/constants'

const ALL_CATS = [...new Set([...EXPENSE_CATS, ...INCOME_CATS, ...BILL_CATS, ...TRANSFER_CATS])].sort()

export default function Transactions() {
  const accounts             = useFinanceStore(s => s.accounts)
  const transactions         = useFinanceStore(s => s.transactions)
  const transactionsMeta     = useFinanceStore(s => s.transactionsMeta)
  const transactionsLoading  = useFinanceStore(s => s.transactionsLoading)
  const txFilters            = useFinanceStore(s => s.txFilters)
  const setTxFilters         = useFinanceStore(s => s.setTxFilters)
  const addTransaction       = useFinanceStore(s => s.addTransaction)
  const addTransfer          = useFinanceStore(s => s.addTransfer)
  const deleteTransaction    = useFinanceStore(s => s.deleteTransaction)
  const loadMoreTransactions = useFinanceStore(s => s.loadMoreTransactions)
  const goals                = useFinanceStore(s => s.goals)

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving]       = useState(false)

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.name]))

  // Hide the 'in' leg of transfers to avoid showing both sides
  const visible = transactions.filter(tx => tx.type !== 'transfer' || tx.xfer_dir === 'out')

  async function handleSubmitSingle(fields) {
    setSaving(true)
    try {
      await addTransaction(fields)
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitTransfer(fields) {
    setSaving(true)
    try {
      await addTransfer(fields)
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const hasMore = transactionsMeta.total > transactions.length

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">Transactions</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {transactionsMeta.total > 0
              ? `${transactionsMeta.total} total`
              : 'No transactions yet'}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-1.5" disabled={accounts.length === 0}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Filters */}
      <Card className="py-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select
            value={txFilters.accountId ?? ''}
            onChange={e => setTxFilters({ accountId: e.target.value || null })}
          >
            <option value="">All Accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>

          <Select
            value={txFilters.type ?? ''}
            onChange={e => setTxFilters({ type: e.target.value || null })}
          >
            <option value="">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="bill">Bill</option>
            <option value="transfer">Transfer</option>
          </Select>

          <Select
            value={txFilters.category ?? ''}
            onChange={e => setTxFilters({ category: e.target.value || null })}
          >
            <option value="">All Categories</option>
            {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>

          <input
            type="date"
            value={txFilters.startDate ?? ''}
            onChange={e => setTxFilters({ startDate: e.target.value || null })}
            className="w-full rounded-lg border border-surface-border bg-white px-2 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            title="Start date filter"
          />
        </div>
      </Card>

      {/* Transaction list */}
      <Card className="p-2">
        {accounts.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            heading="Add an account first"
            sub="You need at least one account before adding transactions."
          />
        ) : transactionsLoading && visible.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} heading="Loading…" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            heading="No transactions"
            sub="Add your first transaction to get started."
          />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {visible.map(tx => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  accountName={accountMap[tx.account_id]}
                  onClick={() => {}}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-3 flex justify-center">
                <Button variant="ghost" size="sm" onClick={loadMoreTransactions}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Transaction"
        size="md"
      >
        <TransactionForm
          accounts={accounts}
          goals={goals}
          onSubmitSingle={handleSubmitSingle}
          onSubmitTransfer={handleSubmitTransfer}
          onCancel={() => setModalOpen(false)}
          loading={saving}
        />
      </Modal>
    </div>
  )
}
