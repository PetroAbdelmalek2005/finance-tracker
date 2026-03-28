# CLAUDE.md — Finance Tracker

This file is intended for AI assistants (Claude, Copilot, etc.) working on this codebase. It explains architecture, conventions, and workflows to follow.

---

## Project Overview

**Finance Tracker** is a personal finance dashboard built as a single-page application (SPA). It is entirely client-side — no backend, no build system, no npm. The entire application lives in one HTML file (`index.html`, ~4,500 lines) with embedded CSS and JavaScript.

**Live Features:**
- Account management (multi-type, multi-currency CAD/USD)
- Transaction tracking (expense, income, bill, transfer)
- Budget management with adherence tracking
- Investment portfolio (stocks with live Yahoo Finance prices)
- Savings goals with auto-tracking
- Cloud sync to Google Sheets, GitHub Gist, or JSONBin
- OFX/QFX/CSV import from bank statements
- PWA support (offline-capable, installable)
- Dark/light theme
- Health score with daily check-in streaks

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (inline, CSS variables) |
| Logic | Vanilla JavaScript (ES6+) |
| Charts | Chart.js 4.4.1 (CDN) |
| Fonts | Google Fonts — DM Serif Display, DM Sans (CDN) |
| Storage | localStorage |
| Offline | Service Worker (`sw.js`) |
| PWA | `manifest.json` |

**No build tool, no package manager, no TypeScript, no framework.**

---

## File Structure

```
finance-tracker/
├── index.html            # Entire application (HTML + CSS + JS)
├── sw.js                 # Service worker (offline caching + background sync)
├── manifest.json         # PWA manifest
├── README.md             # Minimal title only
├── FEATURE_GAP_ANALYSIS.md  # Roadmap & known gaps
└── CLAUDE.md             # This file
```

### `index.html` Internal Layout

| Lines | Content |
|---|---|
| 1–390 | `<style>` block — all CSS |
| 392–1184 | HTML structure (sidebar, tabs, modals) |
| 1186–4548 | `<script>` block — all JavaScript |

The JavaScript is divided by comment banners:
```javascript
// ═══════════════════════════════════════════════
// SECTION NAME
// ═══════════════════════════════════════════════
```

---

## Architecture

### State Management

All application state lives in a single global object `S`:

```javascript
let S = {
  accounts: [],
  transactions: [],
  budgets: [],
  stocks: [],
  goals: []
}
```

- `saveLocal()` — serializes `S` to `localStorage` key `ft_data_v2`
- `loadLocal()` — deserializes from localStorage on startup
- `renderAll()` — re-renders every view; call after any state mutation
- Individual `render{Feature}()` functions for targeted re-renders

### Configuration

Sync provider credentials are stored in `localStorage` under `ft_config`:

```javascript
CONFIG = {
  syncProvider: 'sheets' | 'gist' | 'jsonbin' | 'none',
  scriptUrl: '',    // Google Apps Script endpoint
  sheetId: '',
  gistToken: '',
  gistId: '',
  jsonbinKey: '',
  jsonbinId: '',
  autoSync: true
}
```

### Data Models

**Account**
```javascript
{ id, name, type, balance, currency }
// type: Chequing|Savings|CreditCard|FHSA|TFSA|RRSP|Loan|Other
// currency: 'CAD' | 'USD'
```

**Transaction**
```javascript
{ id, date, desc, type, amount, cat, account, xferDir, xferRef, dueDate, goalId, bucket }
// type: expense|income|transfer|bill
// bucket: Bills|Spending|Savings|Investing
// xferDir: 'in' | 'out' (transfers only)
```

**Budget**
```javascript
{ id, cat, amount }
```

**Stock**
```javascript
{ id, ticker, name, shares, costPerShare, current, linkedAccount }
```

**Goal**
```javascript
{ id, name, target, current, deadline, linkedAccount, trackMode }
// trackMode: 'account' | 'manual'
```

### Sync Providers

Cloud sync uses three optional providers (user picks one):

| Provider | Read | Write |
|---|---|---|
| Google Sheets | Apps Script `GET /exec?action=read` | Apps Script `POST /exec` |
| GitHub Gist | `GET /gists/{id}` | `PATCH /gists/{id}` |
| JSONBin | `GET /v3/b/{id}/latest` | `PUT /v3/b/{id}` |

Auto-sync fires 3 seconds after any state change (debounced). Periodic sync runs every 2 minutes.

### Charts

Chart.js instances are cached in a global `charts` object to avoid re-creating on every render. Always call `.destroy()` on an existing chart before creating a new one for the same canvas.

### Performance Caches

These caches are populated lazily and must be invalidated when state changes:

- `_txDateCache` — Maps transaction IDs to `Date` objects
- `_goalNameMap` — Maps goal IDs to names
- `_txFilterOptionsCache` — Cached filter option lists

Call `invalidateDateCache()` after mutating transactions.

---

## Code Conventions

### Naming

| Thing | Convention | Example |
|---|---|---|
| Variables / functions | camelCase | `renderDash()`, `activeTab` |
| Constants | UPPER_SNAKE_CASE | `EXPENSE_CATS`, `AUTO_SYNC_DEBOUNCE_MS` |
| CSS classes | kebab-case | `.nav-btn`, `.modal-bg` |
| HTML IDs | kebab-case | `#tab-dashboard`, `#tx-modal` |
| Data IDs | nanoid-style lowercase strings | `"a1b2c3"` |

### Patterns

- **Render on mutation** — After every state change: call `saveLocal()`, then `renderAll()` (or a targeted render).
- **No reactive framework** — All DOM updates are manual via `innerHTML` or `textContent` reassignment.
- **Async sync** — Sync operations use `async/await` with `try/catch`. Failures are logged to console and surfaced as toasts.
- **Toast notifications** — Use `showToast(message, type)` for all user-facing feedback (`type`: `'success'`, `'error'`, `'info'`).
- **Modal pattern** — Modals use `.modal-bg` with a `.modal` child. Show via `el.style.display='flex'`, hide via `el.style.display='none'`.
- **Transfers** — Transfers create two linked transactions (one `xferDir:'out'`, one `xferDir:'in'`) linked by `xferRef`. Do not double-count them in summaries.

### IDs

Generate new record IDs with the existing helper (search for `genId` in the script block). Do not use `Math.random()` directly.

---

## UI Structure

### Navigation

- **Desktop**: Fixed sidebar (220px) with vertical tab buttons
- **Mobile** (≤680px): Bottom navigation bar with icon buttons

### Tabs

| Tab | HTML ID | Render Function |
|---|---|---|
| Dashboard | `tab-dashboard` | `renderDash()` |
| Accounts | `tab-accounts` | `renderAccounts()` |
| Transactions | `tab-transactions` | `renderTx()` |
| Investments | `tab-investments` | `renderInvestments()` |
| Goals | `tab-goals` | `renderGoals()` |

Settings are in a slide-in panel, not a tab.

### Modals

| Purpose | ID |
|---|---|
| Add/edit transaction | `tx-modal` |
| Add/edit account | `acct-modal` |
| Add/edit stock | `stock-modal` |
| Add/edit goal | `goal-modal` |
| Add/edit budget | `budget-modal` |
| Import transactions | `import-modal` |
| Initial setup config | `config-modal` |

---

## Responsive Breakpoints

| Breakpoint | Target |
|---|---|
| ≤680px | Mobile (bottom nav, stacked layout) |
| ≤900px | Tablet (condensed sidebar) |
| >900px | Desktop (full sidebar + multi-column grid) |

CSS uses `repeat(auto-fit, minmax(...))` grid patterns extensively.

---

## LocalStorage Keys

| Key | Contents |
|---|---|
| `ft_data_v2` | Full state object `S` |
| `ft_config` | Sync configuration |
| `ft_skipped_config` | Boolean — user skipped setup |
| `ft_theme` | `"dark"` or `"light"` |
| `ft_checkins_v1` | Array of ISO date strings (daily check-ins) |
| `ft_milestones_v1` | Achievement tracking object |

---

## Service Worker (`sw.js`)

- Caches the app shell for offline use
- Listens for `sync` event tagged `ft-sync`
- On network restore, posts a message to the main window to trigger re-sync
- Does **not** intercept POST requests to external sync APIs

---

## How to Run

No build step required. Open `index.html` directly in a browser, or serve the directory with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

For PWA/service worker functionality, HTTPS or `localhost` is required.

---

## Development Guidelines for AI Assistants

1. **Edit `index.html` only** — There is no separate JS or CSS file. All changes go into the single HTML file.

2. **Preserve section banners** — Keep the `// ═══ SECTION ═══` comment dividers to maintain readability of the monolithic file.

3. **Always call `saveLocal()` + `renderAll()` after state mutations** — Never mutate `S` without persisting and re-rendering.

4. **Invalidate caches** — After modifying transactions, call `invalidateDateCache()`.

5. **No build system** — Do not introduce npm, webpack, TypeScript, or any build tooling unless explicitly requested.

6. **No new files for features** — Keep all code inside `index.html`. Only create new standalone files if adding a completely independent service (e.g., a new service worker feature).

7. **Match existing style** — Use the CSS variable tokens (e.g., `var(--accent)`, `var(--bg-card)`) for all new UI. Do not hardcode colors.

8. **Test sync providers independently** — Google Sheets, Gist, and JSONBin paths are separate code branches. Changes to sync logic must not break any provider.

9. **Handle transfers carefully** — When computing account balances or category totals, always check `xferDir` and `xferRef` to avoid double-counting.

10. **Currency conversions** — USD-denominated accounts use a live exchange rate fetched from Open Exchange Rates. Always apply the stored `usdRate` when converting to CAD for net worth calculations.

---

## Known Gaps (from `FEATURE_GAP_ANALYSIS.md`)

- No user authentication
- No AI-driven insights
- Formal 4-bucket allocation engine is partial
- Loading skeletons (CSS exists, but render logic is incomplete)
- Multi-currency ledger (beyond CAD/USD pair) not supported

---

## External APIs Used

| API | Purpose | Auth |
|---|---|---|
| Google Apps Script | Primary sync | None (public deployment URL) |
| GitHub Gist API | Alternative sync | Personal access token |
| JSONBin API | Alternative sync | API key |
| Yahoo Finance (v8) | Live stock prices | None |
| Open Exchange Rates | USD/CAD rate | None (free tier, no key) |
| CORS proxies (allorigins.win, corsproxy.io) | Bypass CORS on Yahoo Finance | None |
