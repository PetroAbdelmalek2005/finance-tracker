require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PlaidApi, PlaidEnvironments, Configuration, Products, CountryCode } = require('plaid');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Plaid Client ─────────────────────────────────────────────────────────────
const plaidEnv = process.env.PLAID_ENV || 'sandbox';
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[plaidEnv],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});
const plaid = new PlaidApi(plaidConfig);

// ─── Anthropic Client ─────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory token store (use a DB for production)
const accessTokens = {}; // { item_id: access_token }

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', env: plaidEnv }));

// ─── Plaid: Create Link Token ─────────────────────────────────────────────────
app.post('/plaid/create-link-token', async (req, res) => {
  try {
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: 'budget-tracker-user' },
      client_name: 'Budget Tracker',
      products: [Products.Transactions],
      country_codes: [CountryCode.Ca, CountryCode.Us],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('create-link-token error:', err?.response?.data || err.message);
    res.status(500).json({ error: err?.response?.data?.error_message || err.message });
  }
});

// ─── Plaid: Exchange Public Token ─────────────────────────────────────────────
app.post('/plaid/exchange-token', async (req, res) => {
  const { public_token } = req.body;
  if (!public_token) return res.status(400).json({ error: 'public_token required' });

  try {
    const response = await plaid.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = response.data;
    accessTokens[item_id] = access_token;
    res.json({ item_id });
  } catch (err) {
    console.error('exchange-token error:', err?.response?.data || err.message);
    res.status(500).json({ error: err?.response?.data?.error_message || err.message });
  }
});

// ─── Plaid: Fetch Transactions ─────────────────────────────────────────────────
app.get('/plaid/transactions', async (req, res) => {
  const { item_id, start_date, end_date } = req.query;
  const access_token = accessTokens[item_id];
  if (!access_token) return res.status(404).json({ error: 'Item not found. Re-link your bank.' });

  try {
    const response = await plaid.transactionsGet({
      access_token,
      start_date: start_date || fmtDate(daysAgo(30)),
      end_date: end_date || fmtDate(new Date()),
      options: { count: 500, offset: 0 },
    });
    res.json({ transactions: response.data.transactions });
  } catch (err) {
    console.error('transactions error:', err?.response?.data || err.message);
    res.status(500).json({ error: err?.response?.data?.error_message || err.message });
  }
});

// ─── Plaid: Fetch Balances ─────────────────────────────────────────────────────
app.get('/plaid/balances', async (req, res) => {
  const { item_id } = req.query;
  const access_token = accessTokens[item_id];
  if (!access_token) return res.status(404).json({ error: 'Item not found' });

  try {
    const response = await plaid.accountsBalanceGet({ access_token });
    res.json({ accounts: response.data.accounts });
  } catch (err) {
    console.error('balances error:', err?.response?.data || err.message);
    res.status(500).json({ error: err?.response?.data?.error_message || err.message });
  }
});

// ─── AI: Categorize Single Transaction ────────────────────────────────────────
app.post('/ai/categorize', async (req, res) => {
  const { description, merchant, amount, categories } = req.body;
  try {
    const result = await categorizeOne(description, merchant, amount, categories);
    res.json(result);
  } catch (err) {
    console.error('categorize error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── AI: Categorize Batch ─────────────────────────────────────────────────────
app.post('/ai/categorize-batch', async (req, res) => {
  const { transactions, categories } = req.body;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.json({ results: {} });
  }

  try {
    // Build a single prompt for the whole batch to minimize API calls
    const prompt = `Categorize each of these financial transactions into exactly one of these categories:
${categories.join(', ')}

For each transaction, respond with JSON. Return an array where each element has:
- id: the transaction id
- category: the best matching category from the list
- confidence: a number between 0 and 1
- reasoning: one short sentence explaining why

Transactions:
${transactions.map((t) =>
  `{"id":"${t.id}","merchant":"${t.merchant || ''}","description":"${t.description}","amount":${t.amount}}`
).join('\n')}

Respond with ONLY a JSON array. No markdown, no explanation.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const parsed = JSON.parse(text.trim());

    const results = {};
    for (const item of parsed) {
      results[item.id] = {
        category: item.category,
        confidence: item.confidence,
        reasoning: item.reasoning,
      };
    }
    res.json({ results });
  } catch (err) {
    console.error('batch categorize error:', err.message);
    // Fall back to empty results so the app still works
    res.json({ results: {} });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function categorizeOne(description, merchant, amount, categories) {
  const prompt = `Categorize this financial transaction into exactly one of these categories: ${categories.join(', ')}

Transaction:
- Merchant: ${merchant || description}
- Description: ${description}
- Amount: $${Math.abs(amount)} (${amount < 0 ? 'income/credit' : 'expense'})

Respond with ONLY JSON: {"category":"...","confidence":0.95,"reasoning":"..."}`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 128,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  return JSON.parse(text.trim());
}

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Budget Tracker backend running on port ${PORT} (${plaidEnv})`));
