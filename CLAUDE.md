# CLAUDE.md — Finance Tracker

This file is intended for AI assistants (Claude, Copilot, etc.) working on this codebase. It explains architecture, conventions, and workflows to follow.

---

## Project Overview

**Finance Tracker** is a single-user personal finance app: a chat-first way to log transactions and ask spending questions, a dashboard for browsing/editing/filtering transactions, and a statements importer that reconciles bank CSV/PDF exports against what's already logged.

Everything is served from one Cloudflare Worker: the static frontend and the JSON API share one origin, so there's no CORS to manage.

**Live Features:**
- Chat-based transaction logging — natural language in, an editable confirm card out, never auto-saved
- Chat-based spending Q&A, answered by Gemini grounded in the current month's actual transactions
- Dashboard: inline edit/delete, filter by month/category/currency, category totals bar chart
- Bank statement import: CSV (parsed client-side) or PDF (sent to Gemini as multimodal input), reconciled against existing transactions
- Dark "ledger" themed UI with a ticker tape of recent transactions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Hosting | Cloudflare Workers (serves both static assets and `/api/*`) |
| Database | Cloudflare D1 (SQLite) |
| AI | Google Gemini — `gemini-2.5-flash-lite` for chat parsing, `gemini-2.5-flash` for statement extraction (multimodal PDF support) |
| Frontend | Vanilla HTML/CSS/JS — no framework, no bundler |
| Charts | Chart.js 4.4.1 (CDN) |
| CSV parsing | PapaParse 5.4.1 (CDN), client-side only |
| Fonts | Google Fonts — DM Sans, JetBrains Mono (CDN) |

**No build tool, no package manager beyond Wrangler, no TypeScript, no frontend framework.**

---

## File Structure

```
finance-tracker/
├── public/                 # static assets, served via Workers Assets binding
│   ├── index.html            # shell: auth gate, ticker tape, 3 tabs, bottom nav
│   ├── style.css              # dark ledger theme, CSS custom properties
│   └── app.js                  # all frontend logic
├── src/
│   └── worker.js              # Worker entry point — handles everything under /api/*
├── migrations/
│   └── 0001_init.sql          # D1 schema + default categories seed
├── wrangler.toml
├── package.json                # wrangler devDependency only
└── CLAUDE.md                   # this file
```

Routing precedence: Cloudflare checks `public/` for a matching static file first; only unmatched paths (in practice, everything under `/api/*`) reach `src/worker.js`. `worker.js` does not need to reference the `ASSETS` binding itself.

---

## Data Model (D1)

**transactions**
```sql
id TEXT PRIMARY KEY, date TEXT, merchant TEXT, category TEXT,
type TEXT ('expense'|'income'), amount REAL, currency TEXT ('CAD'|'USD'|'EUR'|'GBP'),
notes TEXT, source TEXT, createdAt TEXT
```

**categories**
```sql
category TEXT PRIMARY KEY
```
Default categories: Groceries, Dining, Transport, Gas, Housing, Utilities, Subscriptions, Shopping, Health, Entertainment, Travel, Income, Transfers, Other. New categories are created on demand — any transaction write whose `category` isn't already in the table gets it inserted (`INSERT OR IGNORE`).

IDs are `crypto.randomUUID()`, generated server-side in `worker.js` — never client-side, never `Math.random()`.

---

## API Routes (`src/worker.js`, all under `/api/`)

| Route | Purpose |
|---|---|
| `GET /api/transactions` | List, with optional `?month=YYYY-MM&category=&currency=` filters |
| `POST /api/transactions` | Create |
| `PUT /api/transactions/:id` | Update |
| `DELETE /api/transactions/:id` | Delete |
| `GET /api/categories` | List known categories |
| `POST /api/chat/parse` | `{ text }` → Gemini decides: log a transaction, answer a spending question, or ask a clarifying question |
| `POST /api/statements/csv` | `{ rows }` (client-parsed CSV) → Gemini extracts + categorizes transactions |
| `POST /api/statements/pdf` | `{ base64 }` → same, via Gemini multimodal (`inline_data`, `mime_type: application/pdf`) |
| `GET /api/test` | Connectivity check — confirms auth + D1 wiring, no Gemini call |

All routes require `Authorization: Bearer <API_SECRET>`; a mismatch returns `401` before any D1 or Gemini call happens (so an unauthenticated request never burns Gemini quota).

### Gemini calling convention

Every Gemini call goes through the `callGemini()` helper in `worker.js`, which always sets `generationConfig.responseMimeType = "application/json"` plus a `responseSchema`. **Never** hand-roll JSON extraction from free-text model output — if a new route needs structured output, give it a schema and use the helper.

---

## Code Conventions

### Naming

| Thing | Convention | Example |
|---|---|---|
| Variables / functions | camelCase | `renderTxList()`, `activeTab` |
| Constants | UPPER_SNAKE_CASE | `CATEGORIES`, `CHAT_SCHEMA` |
| CSS classes | kebab-case | `.tx-row`, `.confirm-card` |
| HTML IDs | kebab-case | `#tab-dashboard`, `#chat-form` |

### Patterns

- **Frontend state**: a single `state` object in `app.js` (`secret`, `transactions`, `categories`, `activeTab`). After any mutation (`POST`/`PUT`/`DELETE`), reload from the API and re-render the affected views — there's no client-side cache invalidation logic to maintain, the transaction list is small enough to just refetch.
- **Auth gate**: the shared secret lives in `localStorage` (`ft_secret`), entered once via the gate screen, sent as `Authorization: Bearer` on every `/api/*` call through the `api()` wrapper in `app.js`. A `401` clears it and re-shows the gate. This is *not* real security — it's just enough that a stranger who finds the URL can't burn Gemini quota or write into the database.
- **Chat confirm cards**: `log_transaction` results are always rendered as an editable card with Save/Cancel — the frontend must never call `POST /api/transactions` directly off a chat response without the user confirming.
- **Transfers/multi-currency beyond the 4 supported currencies**: out of scope. `currency` is constrained to `CAD|USD|EUR|GBP` at the D1 level (`CHECK` constraint) and in the Gemini response schemas.
- **Reconciliation matching**: statement rows are matched against existing transactions by `amount` equality (within $0.01) and `date` within 3 days — see `reconcileStatement()` in `app.js`. This runs client-side against the already-loaded transaction list, not in the Worker.

---

## UI Structure

### Navigation

Bottom nav bar (mobile-first, also used on desktop) with three tabs, toggled via `.tab`/`.active` classes in `app.js`'s `switchTab()`:

| Tab | HTML ID |
|---|---|
| Chat | `tab-chat` |
| Dashboard | `tab-dashboard` |
| Statements | `tab-statements` |

A ticker tape (`#ticker`) above the tabs shows the 15 most recent transactions on a CSS marquee animation — teal for income, amber for expense.

---

## Environment / Secrets

Set via `wrangler secret put`, never committed:

| Secret | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `API_SECRET` | Shared-secret value checked against every `/api/*` request's `Authorization` header |

`wrangler.toml` binds `DB` (D1 database) and `ASSETS` (static assets directory `./public`).

---

## How to Run

```bash
npm install
npx wrangler d1 migrations apply finance-tracker-db --local   # first time / after schema changes
npx wrangler dev                                               # local dev server, http://localhost:8787
```

Deploy:
```bash
npx wrangler d1 migrations apply finance-tracker-db --remote   # first time / after schema changes
npx wrangler deploy
```

---

## Development Guidelines for AI Assistants

1. **No build system** — do not introduce npm frontend deps, a bundler, TypeScript, or a frontend framework unless explicitly requested. `public/` is served as-is.
2. **Keep the Worker framework-free** — the route count is small; a router library is not warranted.
3. **New Gemini-backed routes** must use `callGemini()` with a `responseSchema` — never parse free text for structured data.
4. **Never auto-save from chat** — any transaction Gemini proposes from `/api/chat/parse` must go through the confirm-card flow.
5. **D1 schema changes** go in a new numbered file under `migrations/` (e.g. `0002_*.sql`) — never edit `0001_init.sql` after it's been applied anywhere.
6. **Match existing style** — use the CSS variable tokens in `style.css` (`var(--teal)`, `var(--amber)`, `var(--bg-card)`, etc.) for new UI; don't hardcode colors.
