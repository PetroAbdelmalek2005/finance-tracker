import { Account, Transaction } from '../types';
import { nanoid } from 'nanoid/non-secure';

interface PlaidApiOptions {
  backendUrl: string;
}

export async function createLinkToken(backendUrl: string): Promise<string> {
  const res = await fetch(`${backendUrl}/plaid/create-link-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to create link token');
  const data = await res.json();
  return data.link_token;
}

export async function exchangePublicToken(
  backendUrl: string,
  publicToken: string,
  institutionName: string,
  plaidAccounts: Array<{ id: string; name: string; mask: string; type: string; subtype: string }>
): Promise<{ itemId: string; accounts: Account[] }> {
  const res = await fetch(`${backendUrl}/plaid/exchange-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_token: publicToken }),
  });
  if (!res.ok) throw new Error('Failed to exchange token');
  const data = await res.json();

  const accounts: Account[] = plaidAccounts.map((a) => ({
    id: nanoid(),
    name: a.name,
    type: a.subtype || a.type,
    balance: 0,
    currency: 'CAD',
    plaidAccountId: a.id,
    plaidItemId: data.item_id,
    institution: institutionName,
    mask: a.mask,
  }));

  return { itemId: data.item_id, accounts };
}

export async function fetchTransactions(
  backendUrl: string,
  itemId: string,
  accountMap: Record<string, string> // plaidAccountId -> our account id
): Promise<Transaction[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();

  const res = await fetch(
    `${backendUrl}/plaid/transactions?item_id=${itemId}&start_date=${fmtDate(startDate)}&end_date=${fmtDate(endDate)}`,
    { method: 'GET' }
  );
  if (!res.ok) throw new Error('Failed to fetch transactions');
  const data = await res.json();

  return (data.transactions as any[]).map((t) => ({
    id: nanoid(),
    date: t.date,
    description: t.name,
    merchant: t.merchant_name || t.name,
    amount: t.amount, // Plaid: positive = debit, negative = credit
    category: 'Other',
    accountId: accountMap[t.account_id] || '',
    pending: t.pending,
    plaidTransactionId: t.transaction_id,
    aiCategory: undefined,
    aiConfidence: undefined,
    reviewed: false,
  }));
}

export async function fetchBalances(
  backendUrl: string,
  itemId: string
): Promise<Record<string, number>> {
  const res = await fetch(`${backendUrl}/plaid/balances?item_id=${itemId}`);
  if (!res.ok) throw new Error('Failed to fetch balances');
  const data = await res.json();
  const map: Record<string, number> = {};
  for (const acc of data.accounts) {
    map[acc.account_id] = acc.balances.current ?? 0;
  }
  return map;
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}
