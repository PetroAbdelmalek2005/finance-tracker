export function computeNetWorth(accounts, usdCadRate = 1.36) {
  return accounts.reduce((sum, acct) => {
    const balance = acct.currency === 'USD' ? acct.balance * usdCadRate : acct.balance
    return sum + balance
  }, 0)
}

export function computeMonthlyIncome(transactions, month = new Date()) {
  const y = month.getFullYear()
  const m = month.getMonth()
  return transactions
    .filter(tx => {
      const d = new Date(tx.date + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() === m && tx.type === 'income'
    })
    .reduce((sum, tx) => sum + tx.amount, 0)
}

export function computeMonthlySpending(transactions, month = new Date()) {
  const y = month.getFullYear()
  const m = month.getMonth()
  return transactions
    .filter(tx => {
      const d = new Date(tx.date + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() === m && (tx.type === 'expense' || tx.type === 'bill')
    })
    .reduce((sum, tx) => sum + tx.amount, 0)
}

export function computeSpendingByCategory(transactions, month = new Date()) {
  const y = month.getFullYear()
  const m = month.getMonth()
  const result = {}
  transactions
    .filter(tx => {
      const d = new Date(tx.date + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() === m && (tx.type === 'expense' || tx.type === 'bill')
    })
    .forEach(tx => {
      result[tx.category] = (result[tx.category] || 0) + tx.amount
    })
  return result
}

export function getAccountById(accounts, id) {
  return accounts.find(a => a.id === id)
}

export function getGoalProgress(goal, accounts) {
  const current =
    goal.track_mode === 'account' && goal.linked_account_id
      ? (accounts.find(a => a.id === goal.linked_account_id)?.balance ?? 0)
      : goal.current_amount
  const percent = goal.target_amount > 0 ? Math.min(100, (current / goal.target_amount) * 100) : 0
  return { current, percent }
}
