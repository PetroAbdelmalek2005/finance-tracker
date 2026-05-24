import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Maps Plaid personal_finance_category.primary → app transaction type
const CAT_TYPE: Record<string, string> = {
  INCOME: 'income',
  INCOME_DIVIDENDS: 'income',
  INCOME_INTEREST_EARNED: 'income',
  INCOME_WAGES: 'income',
  TRANSFER_IN: 'transfer',
  TRANSFER_OUT: 'transfer',
  LOAN_PAYMENTS: 'bill',
}

// Maps Plaid personal_finance_category.primary → app category label
const CAT_LABEL: Record<string, string> = {
  FOOD_AND_DRINK: 'Food & Dining',
  TRANSPORTATION: 'Transport',
  ENTERTAINMENT: 'Entertainment',
  GENERAL_MERCHANDISE: 'Shopping',
  MEDICAL: 'Health',
  PERSONAL_CARE: 'Personal Care',
  RENT_AND_UTILITIES: 'Utilities',
  TRAVEL: 'Travel',
  LOAN_PAYMENTS: 'Car Payment',
  GENERAL_SERVICES: 'Other',
  HOME_IMPROVEMENT: 'Housing',
  EDUCATION: 'Education',
  INCOME: 'Salary',
  INCOME_WAGES: 'Salary',
  INCOME_DIVIDENDS: 'Investments',
  TRANSFER_IN: 'Account Transfer',
  TRANSFER_OUT: 'Account Transfer',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!jwt) return json({ error: 'Unauthorized' }, 401)

    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(jwt)
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { item_id } = await req.json()

    // Verify ownership
    const { data: item, error: itemErr } = await serviceClient
      .from('plaid_items')
      .select('*')
      .eq('id', item_id)
      .eq('user_id', user.id)
      .single()
    if (itemErr || !item) return json({ error: 'Item not found' }, 404)

    const plaidEnv = Deno.env.get('PLAID_ENV') ?? 'sandbox'
    const plaidBody = (extra: object) =>
      JSON.stringify({
        client_id: Deno.env.get('PLAID_CLIENT_ID'),
        secret: Deno.env.get('PLAID_SECRET'),
        access_token: item.access_token,
        ...extra,
      })

    // Sync transactions (paginate until has_more = false)
    let cursor = item.cursor ?? null
    const added: any[] = []
    const modified: any[] = []
    const removed: any[] = []

    let hasMore = true
    while (hasMore) {
      const syncRes = await fetch(`https://${plaidEnv}.plaid.com/transactions/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: plaidBody(cursor ? { cursor } : {}),
      })
      const syncBody = await syncRes.json()
      if (!syncRes.ok) throw new Error(syncBody.error_message)

      added.push(...syncBody.added)
      modified.push(...syncBody.modified)
      removed.push(...syncBody.removed)
      cursor = syncBody.next_cursor
      hasMore = syncBody.has_more
    }

    // Build plaid_account_id → app account UUID lookup
    const { data: accountRows } = await serviceClient
      .from('accounts')
      .select('id, plaid_account_id')
      .eq('user_id', user.id)
    const accountLookup = Object.fromEntries(
      (accountRows ?? []).map((a: any) => [a.plaid_account_id, a.id])
    )

    // Insert added transactions
    if (added.length > 0) {
      const rows = added
        .filter((tx: any) => accountLookup[tx.account_id])
        .map((tx: any) => {
          const primary = tx.personal_finance_category?.primary ?? ''
          const txType = CAT_TYPE[primary] ?? (tx.amount > 0 ? 'expense' : 'income')
          return {
            user_id: user.id,
            date: tx.date,
            description: tx.name,
            type: txType,
            amount: Math.abs(tx.amount),
            category: CAT_LABEL[primary] ?? 'Other',
            account_id: accountLookup[tx.account_id],
            plaid_transaction_id: tx.transaction_id,
          }
        })

      if (rows.length > 0) {
        await serviceClient
          .from('transactions')
          .upsert(rows, { onConflict: 'plaid_transaction_id', ignoreDuplicates: true })
      }
    }

    // Update modified transactions
    for (const tx of modified) {
      if (!tx.transaction_id) continue
      const primary = tx.personal_finance_category?.primary ?? ''
      await serviceClient
        .from('transactions')
        .update({
          description: tx.name,
          amount: Math.abs(tx.amount),
          date: tx.date,
          category: CAT_LABEL[primary] ?? 'Other',
        })
        .eq('plaid_transaction_id', tx.transaction_id)
    }

    // Delete removed transactions
    for (const tx of removed) {
      if (tx.transaction_id) {
        await serviceClient
          .from('transactions')
          .delete()
          .eq('plaid_transaction_id', tx.transaction_id)
      }
    }

    // Update sync cursor + timestamp
    await serviceClient
      .from('plaid_items')
      .update({ cursor, last_synced_at: new Date().toISOString() })
      .eq('id', item_id)

    // Refresh account balances from Plaid
    const balanceRes = await fetch(`https://${plaidEnv}.plaid.com/accounts/balance/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: plaidBody({}),
    })
    const balanceBody = await balanceRes.json()
    for (const acct of (balanceBody.accounts ?? [])) {
      const appId = accountLookup[acct.account_id]
      if (appId && acct.balances.current != null) {
        await serviceClient
          .from('accounts')
          .update({ balance: acct.balances.current, plaid_synced_at: new Date().toISOString() })
          .eq('id', appId)
      }
    }

    return json({ added: added.length, modified: modified.length, removed: removed.length, accounts_updated: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
