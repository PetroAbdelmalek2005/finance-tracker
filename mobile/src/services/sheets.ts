import { AppState } from '../types';

export async function pushToSheets(scriptUrl: string, state: AppState): Promise<void> {
  if (!scriptUrl) throw new Error('Google Sheets script URL not configured');

  const payload = {
    action: 'write',
    data: {
      accounts: state.accounts,
      transactions: state.transactions,
      budgets: state.budgets,
      lastSynced: new Date().toISOString(),
      source: 'ios-app',
    },
  };

  const res = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // no-cors means we can't read the response, but if it didn't throw, it was sent
}

export async function pullFromSheets(scriptUrl: string): Promise<Partial<AppState> | null> {
  if (!scriptUrl) throw new Error('Google Sheets script URL not configured');

  const res = await fetch(`${scriptUrl}?action=read`, { method: 'GET' });
  if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`);

  const data = await res.json();
  if (!data || data.error) return null;

  return {
    accounts: data.accounts || [],
    transactions: data.transactions || [],
    budgets: data.budgets || [],
    lastSynced: data.lastSynced,
  };
}
