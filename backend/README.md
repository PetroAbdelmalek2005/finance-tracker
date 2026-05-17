# Budget Tracker Backend

Handles Plaid token exchange (secrets can't live in the mobile app) and Claude AI categorization.

## Quick Deploy to Railway (free)

1. Go to [railway.app](https://railway.app) and sign up
2. New Project → Deploy from GitHub repo → select `finance-tracker` → set root to `/backend`
3. Add these environment variables in Railway settings:

```
PLAID_CLIENT_ID=     # from dashboard.plaid.com
PLAID_SECRET=        # Sandbox secret from Plaid dashboard
PLAID_ENV=sandbox    # change to production when ready
ANTHROPIC_API_KEY=   # from console.anthropic.com
PORT=3000
```

4. Copy the Railway deployment URL (e.g. `https://your-app.up.railway.app`)
5. Paste it into the iOS app → Settings → Backend URL

## Alternative: Render (also free)

Same steps, at [render.com](https://render.com) → New Web Service → connect repo → set build root to `backend/`.

## Plaid Setup

1. Sign up at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Create an app → copy Client ID + Sandbox Secret
3. In sandbox mode, use test credentials:
   - Username: `user_good`
   - Password: `pass_good`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| POST | `/plaid/create-link-token` | Create Plaid Link token for mobile |
| POST | `/plaid/exchange-token` | Exchange public token for access token |
| GET | `/plaid/transactions` | Fetch 30 days of transactions |
| GET | `/plaid/balances` | Fetch current balances |
| POST | `/ai/categorize` | Categorize one transaction |
| POST | `/ai/categorize-batch` | Categorize multiple transactions |

## Local Dev

```bash
cp .env.example .env
# fill in .env
npm install
npm run dev
```
