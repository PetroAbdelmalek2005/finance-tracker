# CLAUDE.md — Finance Tracker

This file is intended for AI assistants (Claude, Copilot, etc.) working on this codebase. It explains architecture, conventions, and workflows to follow.

---

## Project Overview

**Finance Tracker** is a single-user personal finance app: a chat-first way to log transactions and ask spending questions, a dashboard for browsing/editing/filtering transactions, and a statements importer that reconciles bank CSV/PDF exports against what's already logged.

It runs entirely locally: one Node.js process (`server.js`) serves the static frontend and a JSON API, storing everything in a local JSON file (`data.json`). No cloud account, no database server, no build step. The only external call the server makes is to the Google Gemini API for the AI features — that's unavoidable if "chat parses your message" and "extract transactions from a PDF" are supposed to work at all.

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
| Server | Plain Node.js `http` module (`server.js`) — no Express, no framework |
| Storage | A single local JSON file (`data.json`), loaded into memory on start, written after every mutation |
| AI | Google Gemini — `gemini-2.5-flash-lite` for chat parsing, `gemini-2.5-flash` for statement extraction (multimodal PDF support) |
| Frontend | Vanilla HTML/CSS/JS — no framework, no bundler |
| Charts | Chart.js 4.4.1 (CDN) |
| CSV parsing | PapaParse 5.4.1 (CDN), client-side only |

**Zero npm dependencies.** `fetch`, `crypto.randomUUID()`, and `--env-file` are all built into modern Node (20.6+) — nothing to `npm install`.

---

## File Structure

```
finance-tracker/
├── public/                 # static assets, served as-is by server.js
│   ├── index.html            # shell: auth gate, ticker tape, 3 tabs, bottom nav
│   ├── style.css              # dark ledger theme, CSS custom properties
│   └── app.js                  # all frontend logic
├── server.js                 # the entire backend: static file server + /api/* router + JSON storage
├── data.json                 # local data store (gitignored, created on first run)
├── .env.example               # GEMINI_API_KEY, API_SECRET, PORT
└── CLAUDE.md                  # this file
```

Routing in `server.js`: any request whose path does **not** start with `/api/` is served as a static file from `public/`; everything else is handled by the API router in the same file.

---

## Data Model (`data.json`)

```json
{
  "transactions": [
    { "id": "...", "date": "YYYY-MM-DD", "merchant": "...", "category": "...",
      "type": "expense|income", "amount": 0, "currency": "CAD|USD|EUR|GBP",
      "notes": null, "source": null, "createdAt": "ISO timestamp" }
  ],
  "categories": ["Groceries", "Dining", "..."]
}
```

Default categories: Groceries, Dining, Transport, Gas, Housing, Utilities, Subscriptions, Shopping, Health, Entertainment, Travel, Income, Transfers, Other. New categories are created on demand — any transaction write whose `category` isn't already in `db.categories` gets it appended (`upsertCategory()` in `server.js`).

IDs are `crypto.randomUUID()`, generated server-side — never client-side, never `Math.random()`.

There's no concurrency control beyond "whole file gets rewritten after each mutation" — fine for a single-user local app; don't add a real database or a locking layer unless the usage pattern actually changes.

---

## API Routes (`server.js`, all under `/api/`)

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
| `GET /api/test` | Connectivity check — no Gemini call |

All routes require `Authorization: Bearer <API_SECRET>`; a mismatch returns `401` before any Gemini call happens (so an unauthenticated request never burns quota) — relevant mainly if you expose this beyond `localhost` (e.g. on your LAN or through a tunnel).

### Gemini calling convention

Every Gemini call goes through the `callGemini()` helper in `server.js`, which always sets `generationConfig.responseMimeType = "application/json"` plus a `responseSchema`. **Never** hand-roll JSON extraction from free-text model output — if a new route needs structured output, give it a schema and use the helper.

---

## Code Conventions

### Naming

| Thing | Convention | Example |
|---|---|---|
| Variables / functions | camelCase | `renderTxList()`, `activeTab` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_CATEGORIES`, `CHAT_SCHEMA` |
| CSS classes | kebab-case | `.tx-row`, `.confirm-card` |
| HTML IDs | kebab-case | `#tab-dashboard`, `#chat-form` |

### Patterns

- **Frontend state**: a single `state` object in `app.js` (`secret`, `transactions`, `categories`, `activeTab`). After any mutation (`POST`/`PUT`/`DELETE`), reload from the API and re-render the affected views.
- **Auth gate**: the shared secret lives in `localStorage` (`ft_secret`), entered once via the gate screen, sent as `Authorization: Bearer` on every `/api/*` call through the `api()` wrapper in `app.js`. A `401` clears it and re-shows the gate. This is *not* real security — it's just enough that someone else on your network (or a tunnel URL) can't burn Gemini quota or write into your data.
- **Chat confirm cards**: `log_transaction` results are always rendered as an editable card with Save/Cancel — the frontend must never call `POST /api/transactions` directly off a chat response without the user confirming.
- **Currencies**: `currency` is constrained to `CAD|USD|EUR|GBP` in the Gemini response schemas; there's no server-side enum enforcement since there's no schema layer — keep new code consistent with that set rather than adding ad-hoc values.
- **Reconciliation matching**: statement rows are matched against existing transactions by `amount` equality (within $0.01) and `date` within 3 days — see `reconcileStatement()` in `app.js`. This runs client-side against the already-loaded transaction list.

---

## UI Structure

Bottom nav bar (mobile-first, also used on desktop) with three tabs, toggled via `.tab`/`.active` classes in `app.js`'s `switchTab()`:

| Tab | HTML ID |
|---|---|
| Chat | `tab-chat` |
| Dashboard | `tab-dashboard` |
| Statements | `tab-statements` |

A ticker tape (`#ticker`) above the tabs shows the 15 most recent transactions on a CSS marquee animation — teal for income, amber for expense.

---

## Environment

Set in a local `.env` file (never committed — see `.env.example`), loaded via Node's built-in `--env-file` flag:

| Var | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `API_SECRET` | Shared-secret value checked against every `/api/*` request's `Authorization` header |
| `PORT` | Defaults to 3000 |

---

## How to Run

```bash
cp .env.example .env   # fill in GEMINI_API_KEY and pick an API_SECRET
node --env-file=.env server.js
# or: npm start
```

Open `http://localhost:3000`. To reach it from your phone on the same WiFi, use your machine's LAN IP instead of `localhost` (e.g. `http://192.168.1.x:3000`) — the `API_SECRET` gate is what keeps that safe-ish to do.

---

## Development Guidelines for AI Assistants

1. **No build system, no dependencies** — don't add npm packages, a bundler, TypeScript, or a frontend framework unless explicitly requested. Node's built-ins (`http`, `fs`, `crypto`, `fetch`) are enough for everything this app does.
2. **Keep the server framework-free** — the route count is small; a router library is not warranted.
3. **New Gemini-backed routes** must use `callGemini()` with a `responseSchema` — never parse free text for structured data.
4. **Never auto-save from chat** — any transaction Gemini proposes from `/api/chat/parse` must go through the confirm-card flow.
5. **Don't reach for a real database** — `data.json` + in-memory array is intentional for a single local user. If that assumption changes (multi-user, concurrent writers), that's a real design conversation, not a silent upgrade.
6. **Match existing style** — use the CSS variable tokens in `style.css` (`var(--teal)`, `var(--amber)`, `var(--bg-card)`, etc.) for new UI; don't hardcode colors.
