# Finance Tracker

A chat-first personal finance tracker. Log transactions in plain English, ask spending questions, import bank statements — all served from a single Cloudflare Worker backed by D1 and Google Gemini.

See `CLAUDE.md` for architecture and conventions.

## Setup

```bash
npm install
npx wrangler d1 create finance-tracker-db      # paste the returned database_id into wrangler.toml
npx wrangler d1 migrations apply finance-tracker-db --local
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put API_SECRET
npx wrangler dev
```

## Deploy

```bash
npx wrangler d1 migrations apply finance-tracker-db --remote
npx wrangler deploy
```
