import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { CATS_BY_TYPE, BUCKETS } from '@/lib/constants'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function TransactionForm({ initial, accounts, goals, onSubmitSingle, onSubmitTransfer, onCancel, loading }) {
  const defaultType = initial?.type ?? 'expense'
  const [form, setForm] = useState({
    type:        defaultType,
    date:        initial?.date ?? today(),
    description: initial?.description ?? '',
    amount:      initial?.amount != null ? String(initial.amount) : '',
    category:    initial?.category ?? CATS_BY_TYPE[defaultType][0],
    account_id:  initial?.account_id ?? accounts[0]?.id ?? '',
    toAccountId: '',
    bucket:      initial?.bucket ?? '',
    due_date:    initial?.due_date ?? '',
    goal_id:     initial?.goal_id ?? '',
  })
  const [error, setError] = useState(null)

  function setField(key, val) {
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === 'type') next.category = CATS_BY_TYPE[val][0]
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const amount = parseFloat(form.amount)
    if (!form.description.trim()) return setError('Description is required.')
    if (isNaN(amount) || amount <= 0) return setError('Amount must be a positive number.')
    if (!form.account_id) return setError('Select an account.')
    if (form.type === 'transfer') {
      if (!form.toAccountId) return setError('Select a destination account.')
      if (form.account_id === form.toAccountId) return setError('From and To accounts must be different.')
    }

    try {
      if (form.type === 'transfer') {
        await onSubmitTransfer({
          date: form.date,
          description: form.description,
          amount,
          fromAccountId: form.account_id,
          toAccountId:   form.toAccountId,
          category:      form.category,
          bucket:        form.bucket || null,
        })
      } else {
        await onSubmitSingle({
          date:        form.date,
          description: form.description,
          type:        form.type,
          amount,
          category:    form.category,
          account_id:  form.account_id,
          bucket:      form.bucket || null,
          due_date:    form.due_date || null,
          goal_id:     form.goal_id || null,
        })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const cats = CATS_BY_TYPE[form.type]
  const isTransfer = form.type === 'transfer'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Type tabs */}
      <div className="flex rounded-lg border border-surface-border bg-slate-50 p-0.5">
        {['expense', 'income', 'bill', 'transfer'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setField('type', t)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors ${
              form.type === t
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Date"
          id="tx-date"
          type="date"
          value={form.date}
          onChange={e => setField('date', e.target.value)}
        />
        <Input
          label="Amount"
          id="tx-amount"
          type="number"
          step="0.01"
          min="0.01"
          value={form.amount}
          onChange={e => setField('amount', e.target.value)}
          placeholder="0.00"
        />
      </div>

      <Input
        label="Description"
        id="tx-desc"
        value={form.description}
        onChange={e => setField('description', e.target.value)}
        placeholder="e.g. Groceries at Loblaws"
      />

      <Select
        label="Category"
        id="tx-cat"
        value={form.category}
        onChange={e => setField('category', e.target.value)}
      >
        {cats.map(c => <option key={c} value={c}>{c}</option>)}
      </Select>

      {isTransfer ? (
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="From Account"
            id="tx-from"
            value={form.account_id}
            onChange={e => setField('account_id', e.target.value)}
          >
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select
            label="To Account"
            id="tx-to"
            value={form.toAccountId}
            onChange={e => setField('toAccountId', e.target.value)}
          >
            <option value="">Select…</option>
            {accounts
              .filter(a => a.id !== form.account_id)
              .map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </div>
      ) : (
        <Select
          label="Account"
          id="tx-acct"
          value={form.account_id}
          onChange={e => setField('account_id', e.target.value)}
        >
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      )}

      <Select
        label="Bucket (optional)"
        id="tx-bucket"
        value={form.bucket}
        onChange={e => setField('bucket', e.target.value)}
      >
        <option value="">— No bucket —</option>
        {BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
      </Select>

      {form.type === 'bill' && (
        <Input
          label="Due Date (optional)"
          id="tx-due"
          type="date"
          value={form.due_date}
          onChange={e => setField('due_date', e.target.value)}
        />
      )}

      {goals.length > 0 && !isTransfer && (
        <Select
          label="Savings Goal (optional)"
          id="tx-goal"
          value={form.goal_id}
          onChange={e => setField('goal_id', e.target.value)}
        >
          <option value="">— No goal —</option>
          {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Transaction'}
        </Button>
      </div>
    </form>
  )
}
