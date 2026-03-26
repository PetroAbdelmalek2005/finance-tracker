# Finance Tracker Feature Gap Analysis

Date: 2026-03-26

## Current state summary

This app is already a fairly complete personal finance dashboard with:
- account + transaction tracking
- goals
- budgets
- investment tracking with live price refresh
- chart-heavy dashboard
- import/export and Google Sheets sync
- responsive/mobile UX, dark mode, and empty states

## Requested roadmap fit

### Fully or mostly already implemented
- Dashboard with net worth, recent transactions, and charts.
- Transaction CRUD (add, edit, delete) and category assignment.
- Goal tracking with progress bars and optional target date.
- Real-time UI updates after transaction/goal/account changes.
- Responsive layout and dark mode support.
- Empty states in key modules.

### Partially implemented
- "Savings progress" exists via goals and savings-rate metrics, but not a dedicated 4-bucket engine.
- Animations exist (tab fades, progress transitions, hover effects), but no count-up number animation for metrics.
- Currency handling exists for stock quotes metadata, but not full multi-currency account ledger + conversion.
- Settings exist for sync/theme and data controls, but not profile/auth settings.

### Missing relative to your list
- Explicit 4-bucket model (Bills/Spending/Savings/Investing) with per-bucket allocations and balances.
- Authentication (email/password, OAuth, secure sessions).
- AI insights (overspending detection, recommendations, weekly summary).
- Engagement systems (health score, streaks, milestones).
- Widgetized quick actions/summary panel specifically branded as widgets.
- Loading skeletons.
- Time-to-goal estimation shown to users.

## What you have that is already better than the baseline request

Compared with the request, your app already goes beyond scope in several areas:
- Investment portfolio module with ticker lookup and price refresh logic.
- Bank import pipeline (OFX/QFX + CSV) with duplicate detection.
- Google Sheets cloud sync architecture (pull/push + connectivity checks).
- Transfer-aware transaction model (avoids treating transfers as spending).
- Account-level tracking and linked-goal auto-tracking.

## Suggested implementation order

1. Introduce 4-bucket domain model and allocation engine.
2. Add bucket cards/progress/charts to dashboard and transaction assignment workflow.
3. Add time-to-goal estimation and count-up metric animations.
4. Add multi-currency account model + FX conversion service.
5. Add auth (if moving beyond single-user local/sheet model).
6. Add AI insights + engagement layer (score/streak/milestones).
7. Add loading skeletons and final UX polish.

## Quick wins (easy first additions)

These are the fastest, lowest-risk items to ship first:

1. **Add “Money Left Today” metric card**
   - Formula: `(monthly budget - month-to-date spending) / days remaining` or a simple daily spend allowance.
   - Reuses existing transaction + budget data.

2. **Add lightweight 4-bucket tagging on transactions**
   - Add a `bucket` field (`Bills`, `Spending`, `Savings`, `Investing`) on each transaction.
   - Start with manual assignment in add/edit transaction forms.

3. **Add bucket summary cards on dashboard**
   - Show amount + percentage of monthly outflow by bucket.
   - Reuse existing metric card and progress bar components.

4. **Add goal ETA (time-to-goal)**
   - Estimate from average monthly contribution (or net linked-goal inflow).
   - Display “~X months remaining” under each goal.

5. **Add simple weekly insights (rules, non-AI first)**
   - Example: “Food spending is up 18% vs last week.”
   - Builds the foundation for future AI-generated insights.

6. **Add skeleton loaders for dashboard cards/charts**
   - Show while pulling Sheets data to reduce perceived latency.

### Suggested sprint sequence

- **Sprint 1 (very fast):** Money Left Today + Goal ETA + skeleton loaders
- **Sprint 2:** Transaction bucket field + bucket dashboard cards
- **Sprint 3:** Rules-based weekly insights
