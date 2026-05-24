import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAID_TYPE_MAP: Record<string, string> = {
  'depository/checking': 'Chequing',
  'depository/savings': 'Savings',
  'depository/cd': 'Savings',
  'depository/money market': 'Savings',
  'credit/credit card': 'Credit Card',
  'loan/auto': 'Loan',
  'loan/student': 'Loan',
  'loan/mortgage': 'Loan',
  'loan/other': 'Loan',
}

function mapType(type: string, subtype: string): string {
  return PLAID_TYPE_MAP[`${type}/${subtype}`] ?? PLAID_TYPE_MAP[type] ?? 'Other'
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

    const { public_token, institution_id, institution_name, institution_logo } = await req.json()

    const plaidEnv = Deno.env.get('PLAID_ENV') ?? 'sandbox'
    const plaidCreds = {
      client_id: Deno.env.get('PLAID_CLIENT_ID')!,
      secret: Deno.env.get('PLAID_SECRET')!,
    }

    // Exchange public token → access token
    const exchangeRes = await fetch(`https://${plaidEnv}.plaid.com/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...plaidCreds, public_token }),
    })
    const exchangeBody = await exchangeRes.json()
    if (!exchangeRes.ok) return json({ error: exchangeBody.error_message }, 502)

    const { access_token, item_id } = exchangeBody

    // Check for duplicate
    const { data: existing } = await serviceClient
      .from('plaid_items')
      .select('id')
      .eq('id', item_id)
      .single()
    if (existing) return json({ error: 'This institution is already linked.' }, 409)

    // Store access token (server-side only — never returned to client)
    await serviceClient.from('plaid_items').insert({
      id: item_id,
      user_id: user.id,
      access_token,
      institution_id,
      institution_name,
    })

    // Fetch accounts from Plaid
    const accountsRes = await fetch(`https://${plaidEnv}.plaid.com/accounts/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...plaidCreds, access_token }),
    })
    const accountsBody = await accountsRes.json()

    const rows = (accountsBody.accounts ?? []).map((a: any) => ({
      user_id: user.id,
      name: a.name,
      type: mapType(a.type, a.subtype ?? ''),
      balance: a.balances.current ?? 0,
      currency: a.balances.iso_currency_code === 'USD' ? 'USD' : 'CAD',
      plaid_account_id: a.account_id,
      plaid_item_id: item_id,
      institution_name: institution_name ?? null,
      institution_logo: institution_logo ?? null,
    }))

    const { data: insertedAccounts, error: insertErr } = await serviceClient
      .from('accounts')
      .upsert(rows, { onConflict: 'plaid_account_id' })
      .select()
    if (insertErr) throw insertErr

    return json({ accounts: insertedAccounts })
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
