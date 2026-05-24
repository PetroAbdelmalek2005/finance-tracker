import { useState } from 'react'
import { Landmark, Plus } from 'lucide-react'
import { useFinanceStore } from '@/store/financeStore'
import { computeNetWorth } from '@/lib/selectors'
import { formatCurrency } from '@/utils/formatters'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { AccountCard } from '@/components/finance/AccountCard'
import { AccountForm } from '@/components/finance/AccountForm'
import { PlaidLinkButton } from '@/components/finance/PlaidLinkButton'

export default function Accounts() {
  const accounts      = useFinanceStore(s => s.accounts)
  const usdCadRate    = useFinanceStore(s => s.usdCadRate)
  const addAccount    = useFinanceStore(s => s.addAccount)
  const updateAccount = useFinanceStore(s => s.updateAccount)
  const deleteAccount = useFinanceStore(s => s.deleteAccount)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(false)

  const netWorth = computeNetWorth(accounts, usdCadRate)

  async function handleSubmit(fields) {
    setSaving(true)
    try {
      if (editing) {
        await updateAccount(editing.id, fields)
      } else {
        await addAccount(fields)
      }
      setModalOpen(false)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  function openAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(account) {
    setEditing(account)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">Accounts</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage your accounts and balances</p>
        </div>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {/* Net Worth + Plaid */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth</CardTitle>
          <PlaidLinkButton />
        </CardHeader>
        <p className="font-display text-3xl font-semibold text-slate-900">
          {formatCurrency(netWorth)}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
          {accounts.some(a => a.currency === 'USD') &&
            ` · USD converted at ${usdCadRate.toFixed(4)}`}
        </p>
      </Card>

      {/* Account list */}
      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={Landmark}
            heading="No accounts yet"
            sub="Add your first account to start tracking your net worth."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={openEdit}
              onDelete={deleteAccount}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Account' : 'Add Account'}>
        <AccountForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>
    </div>
  )
}
