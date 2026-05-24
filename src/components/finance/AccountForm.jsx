import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ACCOUNT_TYPES, CURRENCIES, LIABILITY_TYPES } from '@/lib/constants'

export function AccountForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? 'Chequing',
    balance: initial?.balance != null ? String(Math.abs(initial.balance)) : '',
    currency: initial?.currency ?? 'CAD',
  })
  const [error, setError] = useState(null)

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return setError('Account name is required.')
    const balance = parseFloat(form.balance)
    if (isNaN(balance)) return setError('Balance must be a number.')

    const isLiability = LIABILITY_TYPES.includes(form.type)
    const finalBalance = isLiability && balance > 0 ? -balance : balance

    try {
      await onSubmit({ ...form, balance: finalBalance })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Account Name"
        id="acct-name"
        value={form.name}
        onChange={e => setField('name', e.target.value)}
        placeholder="e.g. TD Chequing"
        autoFocus
      />
      <Select
        label="Account Type"
        id="acct-type"
        value={form.type}
        onChange={e => setField('type', e.target.value)}
      >
        {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Opening Balance"
          id="acct-balance"
          type="number"
          step="0.01"
          min="0"
          value={form.balance}
          onChange={e => setField('balance', e.target.value)}
          placeholder="0.00"
        />
        <Select
          label="Currency"
          id="acct-currency"
          value={form.currency}
          onChange={e => setField('currency', e.target.value)}
        >
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      {LIABILITY_TYPES.includes(form.type) && (
        <p className="text-xs text-slate-500">
          For {form.type} accounts, enter the amount owed — it will be stored as a negative balance.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Account'}
        </Button>
      </div>
    </form>
  )
}
