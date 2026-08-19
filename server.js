// Finance Tracker — plain Node HTTP server, no framework, no cloud.
// Serves public/ as static files and handles /api/* against a local JSON file.
// Run: node --env-file=.env server.js

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "data.json");
const PORT = process.env.PORT || 3000;

const DEFAULT_CATEGORIES = [
  "Groceries", "Dining", "Transport", "Gas", "Housing", "Utilities",
  "Subscriptions", "Shopping", "Health", "Entertainment", "Travel",
  "Income", "Transfers", "Other",
];

// ── Storage: one JSON file, loaded into memory, written back after each mutation ──

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { transactions: [], categories: [...DEFAULT_CATEGORIES] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

let db = loadData();

function upsertCategory(category) {
  if (category && !db.categories.includes(category)) {
    db.categories.push(category);
  }
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// ── Gemini ───────────────────────────────────────────────────────

const TRANSACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    date: { type: "STRING", description: "ISO date YYYY-MM-DD" },
    merchant: { type: "STRING" },
    category: { type: "STRING" },
    type: { type: "STRING", enum: ["expense", "income"] },
    amount: { type: "NUMBER", description: "always positive" },
    currency: { type: "STRING", enum: ["CAD", "USD", "EUR", "GBP"] },
    notes: { type: "STRING" },
  },
  required: ["date", "merchant", "category", "type", "amount", "currency"],
};

const CHAT_SCHEMA = {
  type: "OBJECT",
  properties: {
    action: { type: "STRING", enum: ["log_transaction", "answer", "clarify"] },
    transaction: TRANSACTION_SCHEMA,
    answer: { type: "STRING" },
    question: { type: "STRING" },
  },
  required: ["action"],
};

const EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    transactions: { type: "ARRAY", items: TRANSACTION_SCHEMA },
  },
  required: ["transactions"],
};

async function callGemini(model, { systemInstruction, contents, responseSchema }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const body = {
    contents,
    generationConfig: { responseMimeType: "application/json", responseSchema },
  };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${model} error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini ${model} returned no content`);
  return JSON.parse(text);
}

// ── Route handlers ──────────────────────────────────────────────

function listTransactions(query) {
  let rows = db.transactions;
  const month = query.get("month");
  const category = query.get("category");
  const currency = query.get("currency");
  if (month) rows = rows.filter((t) => t.date.startsWith(month));
  if (category) rows = rows.filter((t) => t.category === category);
  if (currency) rows = rows.filter((t) => t.currency === currency);
  return [...rows].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
}

function createTransaction(body) {
  const { date, merchant, category, type, amount, currency, notes = null, source = null } = body;
  if (!date || !merchant || !category || !type || amount == null || !currency) {
    return { status: 400, data: { error: "Missing required transaction fields" } };
  }
  const tx = {
    id: crypto.randomUUID(), date, merchant, category, type, amount, currency,
    notes, source, createdAt: new Date().toISOString(),
  };
  upsertCategory(category);
  db.transactions.push(tx);
  saveData();
  return { status: 201, data: tx };
}

function updateTransaction(id, body) {
  const existing = db.transactions.find((t) => t.id === id);
  if (!existing) return { status: 404, data: { error: "Transaction not found" } };
  Object.assign(existing, body, { id });
  upsertCategory(existing.category);
  saveData();
  return { status: 200, data: existing };
}

function deleteTransaction(id) {
  const idx = db.transactions.findIndex((t) => t.id === id);
  if (idx === -1) return { status: 404, data: { error: "Transaction not found" } };
  db.transactions.splice(idx, 1);
  saveData();
  return { status: 200, data: { ok: true } };
}

function listCategories() {
  return [...db.categories].sort();
}

async function chatParse(body) {
  const { text } = body;
  if (!text) return { status: 400, data: { error: "Missing text" } };

  const month = currentMonth();
  const monthTx = db.transactions
    .filter((t) => t.date.startsWith(month))
    .map(({ date, merchant, category, type, amount, currency }) => ({ date, merchant, category, type, amount, currency }));

  const totals = {};
  for (const t of monthTx) {
    const key = `${t.category} (${t.currency})`;
    totals[key] = (totals[key] || 0) + (t.type === "expense" ? t.amount : -t.amount);
  }

  const systemInstruction = `You are the assistant inside a personal finance tracker app. The user will send a short message. Decide exactly one action:
- "log_transaction": the message describes a purchase or income event to record. Fill "transaction" with your best-effort extraction. Use today's date (${new Date().toISOString().slice(0, 10)}) if no date is mentioned. Pick "category" from this list when it fits: ${db.categories.join(", ")}. Only invent a new category name if nothing fits.
- "answer": the message is a question about their spending/income. Answer it using the transaction data provided below as ground truth. Put the answer in "answer".
- "clarify": the message is ambiguous (e.g. missing amount) and you need more information before logging a transaction. Put your question in "question".
Never guess an amount — if it's missing, use "clarify" instead.

Current month (${month}) transactions:
${JSON.stringify(monthTx)}

Current month category totals (positive = net expense, negative = net income, in each currency):
${JSON.stringify(totals)}`;

  const result = await callGemini("gemini-2.5-flash-lite", {
    systemInstruction,
    contents: [{ role: "user", parts: [{ text }] }],
    responseSchema: CHAT_SCHEMA,
  });
  return { status: 200, data: result };
}

async function statementsFromCsv(body) {
  const { rows } = body;
  if (!Array.isArray(rows)) return { status: 400, data: { error: "Missing rows array" } };

  const systemInstruction = `You are extracting bank transactions from parsed CSV rows of a bank/credit-card statement. For each row that represents a real transaction, produce one entry with date (YYYY-MM-DD), merchant, a category from this list when it fits (${db.categories.join(", ")}), type ("expense" or "income"), a positive amount, and currency (assume CAD if not stated). Skip header rows, balance rows, and non-transaction rows.`;

  const result = await callGemini("gemini-2.5-flash", {
    systemInstruction,
    contents: [{ role: "user", parts: [{ text: `CSV rows as JSON:\n${JSON.stringify(rows)}` }] }],
    responseSchema: EXTRACTION_SCHEMA,
  });
  return { status: 200, data: result };
}

async function statementsFromPdf(body) {
  const { base64 } = body;
  if (!base64) return { status: 400, data: { error: "Missing base64" } };

  const systemInstruction = `You are extracting bank transactions from a bank/credit-card statement PDF. For each real transaction, produce one entry with date (YYYY-MM-DD), merchant, a category from this list when it fits (${db.categories.join(", ")}), type ("expense" or "income"), a positive amount, and currency (assume CAD if not stated). Skip summary/balance lines.`;

  const result = await callGemini("gemini-2.5-flash", {
    systemInstruction,
    contents: [{
      role: "user",
      parts: [
        { text: "Extract the transactions from this statement." },
        { inline_data: { mime_type: "application/pdf", data: base64 } },
      ],
    }],
    responseSchema: EXTRACTION_SCHEMA,
  });
  return { status: 200, data: result };
}

// ── HTTP plumbing ────────────────────────────────────────────────

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
}

function checkAuth(req) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return Boolean(token) && Boolean(process.env.API_SECRET) && token === process.env.API_SECRET;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = "";
    req.on("data", (c) => (chunks += c));
    req.on("end", () => {
      if (!chunks) return resolve({});
      try {
        resolve(JSON.parse(chunks));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (!pathname.startsWith("/api/")) {
    return serveStatic(req, res, pathname);
  }

  if (!checkAuth(req)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  try {
    if (pathname === "/api/test" && req.method === "GET") {
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/transactions" && req.method === "GET") {
      return sendJson(res, 200, listTransactions(url.searchParams));
    }
    if (pathname === "/api/transactions" && req.method === "POST") {
      const { status, data } = createTransaction(await readBody(req));
      return sendJson(res, status, data);
    }
    const txMatch = pathname.match(/^\/api\/transactions\/([^/]+)$/);
    if (txMatch && req.method === "PUT") {
      const { status, data } = updateTransaction(txMatch[1], await readBody(req));
      return sendJson(res, status, data);
    }
    if (txMatch && req.method === "DELETE") {
      const { status, data } = deleteTransaction(txMatch[1]);
      return sendJson(res, status, data);
    }

    if (pathname === "/api/categories" && req.method === "GET") {
      return sendJson(res, 200, listCategories());
    }

    if (pathname === "/api/chat/parse" && req.method === "POST") {
      const { status, data } = await chatParse(await readBody(req));
      return sendJson(res, status, data);
    }
    if (pathname === "/api/statements/csv" && req.method === "POST") {
      const { status, data } = await statementsFromCsv(await readBody(req));
      return sendJson(res, status, data);
    }
    if (pathname === "/api/statements/pdf" && req.method === "POST") {
      const { status, data } = await statementsFromPdf(await readBody(req));
      return sendJson(res, status, data);
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || "Internal error" });
  }
});

server.listen(PORT, () => {
  console.log(`Finance Tracker running at http://localhost:${PORT}`);
});
