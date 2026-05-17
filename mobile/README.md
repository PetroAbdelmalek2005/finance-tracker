# Budget Tracker — iOS App

React Native (Expo) budgeting app with Plaid bank sync and AI auto-categorization.

## Features

- **Bank Sync** — Plaid connects to 10,000+ banks and credit cards
- **AI Categorization** — Claude AI auto-categorizes every transaction; you just tap Approve or pick a different category
- **Monthly Budgets** — Set per-category limits, see progress bars in real time
- **Google Sheets Sync** — All data mirrors to a Google Sheet you own
- **Offline-first** — Works without internet, syncs when connected

## Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo`
- Expo Go app on your iPhone ([App Store](https://apps.apple.com/app/expo-go/id982107779))

### Install & Run

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with your iPhone camera (or Expo Go app) to run it instantly.

> **Note:** `react-native-plaid-link-sdk` requires a custom dev build to work fully.
> For Plaid Link to open on a real device, run:
> ```bash
> npx expo install expo-dev-client
> eas build --profile development --platform ios
> ```

### Setup Order

1. **Deploy the backend** — see `../backend/README.md`
2. **Deploy Google Apps Script** — see `../sheets/Code.gs` instructions
3. **Open the app → Settings tab**
4. Enter your Backend URL and Google Sheets URL → Save
5. Tap **Connect Bank / Credit Card** → link your bank via Plaid
6. Transactions are imported and AI-categorized automatically
7. Go to **Review** tab to approve or change categories
8. Go to **Budgets** tab to set monthly limits

## Screens

| Tab | Description |
|-----|-------------|
| Overview | Net worth, spending chart, budget bars, recent accounts |
| Transactions | Searchable/filterable list, tap to edit category |
| Review | AI-categorized transactions pending your approval |
| Budgets | Monthly limits per category, spending vs. budget |
| Settings | Plaid, Google Sheets, and sync configuration |

## Tech Stack

- **React Native** with Expo 51
- **React Navigation** (bottom tabs)
- **AsyncStorage** + **SecureStore** for local persistence
- **Plaid Link SDK** for bank connection
- **Claude Haiku** (via backend) for AI categorization
- **Chart Kit** for spending visualization
