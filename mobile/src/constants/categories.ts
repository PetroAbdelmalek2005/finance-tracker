export const CATEGORIES = [
  'Housing',
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Health & Fitness',
  'Travel',
  'Bills & Utilities',
  'Personal Care',
  'Education',
  'Savings',
  'Income',
  'Transfer',
  'Other',
] as const;

export type Category = typeof CATEGORIES[number];

export const CATEGORY_ICONS: Record<string, string> = {
  Housing: 'home',
  'Food & Dining': 'restaurant',
  Transportation: 'car',
  Shopping: 'cart',
  Entertainment: 'game-controller',
  'Health & Fitness': 'heart',
  Travel: 'airplane',
  'Bills & Utilities': 'flash',
  'Personal Care': 'person',
  Education: 'book',
  Savings: 'trending-up',
  Income: 'cash',
  Transfer: 'swap-horizontal',
  Other: 'ellipsis-horizontal',
};

export const CATEGORY_COLORS: Record<string, string> = {
  Housing: '#7C3AED',
  'Food & Dining': '#EF4444',
  Transportation: '#06B6D4',
  Shopping: '#F59E0B',
  Entertainment: '#8B5CF6',
  'Health & Fitness': '#10B981',
  Travel: '#3B82F6',
  'Bills & Utilities': '#EC4899',
  'Personal Care': '#F97316',
  Education: '#14B8A6',
  Savings: '#22C55E',
  Income: '#84CC16',
  Transfer: '#94A3B8',
  Other: '#64748B',
};

// Maps Plaid categories to our app categories
export const PLAID_CATEGORY_MAP: Record<string, string> = {
  INCOME: 'Income',
  TRANSFER_IN: 'Transfer',
  TRANSFER_OUT: 'Transfer',
  LOAN_PAYMENTS: 'Bills & Utilities',
  BANK_FEES: 'Bills & Utilities',
  ENTERTAINMENT: 'Entertainment',
  FOOD_AND_DRINK: 'Food & Dining',
  GENERAL_MERCHANDISE: 'Shopping',
  HOME_IMPROVEMENT: 'Housing',
  MEDICAL: 'Health & Fitness',
  PERSONAL_CARE: 'Personal Care',
  GENERAL_SERVICES: 'Other',
  GOVERNMENT_AND_NON_PROFIT: 'Other',
  TRANSPORTATION: 'Transportation',
  TRAVEL: 'Travel',
  RENT_AND_UTILITIES: 'Bills & Utilities',
};
