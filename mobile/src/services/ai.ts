import { Transaction } from '../types';
import { CATEGORIES } from '../constants/categories';

interface CategorizationResult {
  category: string;
  confidence: number;
  reasoning: string;
}

export async function categorizeTransaction(
  backendUrl: string,
  transaction: Pick<Transaction, 'description' | 'merchant' | 'amount'>
): Promise<CategorizationResult> {
  const res = await fetch(`${backendUrl}/ai/categorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: transaction.description,
      merchant: transaction.merchant,
      amount: transaction.amount,
      categories: CATEGORIES,
    }),
  });

  if (!res.ok) throw new Error('AI categorization failed');
  return res.json();
}

export async function categorizeBatch(
  backendUrl: string,
  transactions: Array<Pick<Transaction, 'id' | 'description' | 'merchant' | 'amount'>>
): Promise<Record<string, CategorizationResult>> {
  const res = await fetch(`${backendUrl}/ai/categorize-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactions,
      categories: CATEGORIES,
    }),
  });

  if (!res.ok) throw new Error('Batch categorization failed');
  const data = await res.json();
  return data.results; // { [transaction_id]: CategorizationResult }
}
