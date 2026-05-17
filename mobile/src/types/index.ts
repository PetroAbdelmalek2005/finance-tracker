export interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant?: string;
  amount: number; // positive = expense, negative = income
  category: string;
  accountId: string;
  pending: boolean;
  plaidTransactionId?: string;
  aiCategory?: string;
  aiConfidence?: number;
  reviewed: boolean;
  notes?: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  plaidAccountId?: string;
  plaidItemId?: string;
  institution?: string;
  mask?: string; // last 4 digits
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
}

export interface AppConfig {
  backendUrl: string;
  sheetsScriptUrl: string;
  autoSync: boolean;
}

export interface AppState {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  config: AppConfig;
  lastSynced?: string;
}

export interface CategorySummary {
  category: string;
  spent: number;
  budget: number;
  transactionCount: number;
  color: string;
}

export interface PlaidLinkResult {
  publicToken: string;
  metadata: {
    institution: { name: string; institution_id: string };
    accounts: Array<{ id: string; name: string; mask: string; type: string; subtype: string }>;
  };
}
