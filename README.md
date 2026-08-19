# Finance Tracker

A chat-first personal finance tracker. Log transactions in plain English, ask spending questions, import bank statements. Runs entirely on your own machine — one Node.js process, one local JSON file, no cloud account, no database server, no build step. The only outside call is to Google Gemini for the AI features.

See `CLAUDE.md` for architecture and conventions.

## Setup

```bash
cp .env.example .env
# edit .env: set GEMINI_API_KEY (from https://aistudio.google.com/apikey)
#            and pick any passphrase for API_SECRET
node --env-file=.env server.js
```

Open `http://localhost:3000` and enter the `API_SECRET` you picked as the access key.

No `npm install` needed — the app has zero dependencies.
