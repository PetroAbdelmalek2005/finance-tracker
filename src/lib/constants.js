export const ACCOUNT_TYPES = ['Chequing', 'Savings', 'Credit Card', 'FHSA', 'TFSA', 'RRSP', 'Loan', 'Other']
export const LIABILITY_TYPES = ['Credit Card', 'Loan']
export const CURRENCIES = ['CAD', 'USD']

export const EXPENSE_CATS = [
  'Housing', 'Food & Dining', 'Transport', 'Entertainment', 'Shopping',
  'Health', 'Utilities', 'Subscriptions', 'Kids & Family', 'Education',
  'Travel', 'Pets', 'Gifts', 'Donations', 'Personal Care', 'Other',
]

export const INCOME_CATS = ['Salary', 'Freelance', 'Investments', 'Rental', 'Business', 'Gift', 'Other']

export const BILL_CATS = [
  'Rent / Mortgage', 'Electricity', 'Gas', 'Water', 'Internet', 'Phone',
  'Insurance', 'Car Payment', 'Subscription', 'Streaming', 'Gym', 'Other Bill',
]

export const TRANSFER_CATS = [
  'Account Transfer', 'Savings Deposit', 'Investment Contribution', 'Debt Payment', 'Other Transfer',
]

export const BUCKETS = ['Bills', 'Spending', 'Savings', 'Investing']

export const TX_TYPES = ['expense', 'income', 'bill', 'transfer']

export const CATS_BY_TYPE = {
  expense: EXPENSE_CATS,
  income: INCOME_CATS,
  bill: BILL_CATS,
  transfer: TRANSFER_CATS,
}
