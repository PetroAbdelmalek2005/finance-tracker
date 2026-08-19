// Finance Tracker API Worker.
// Static assets (public/) are served automatically by the Workers Assets
// binding before this script runs, so everything reaching here is /api/*.

const CATEGORIES = [
  "Groceries", "Dining", "Transport", "Gas", "Housing", "Utilities",
  "Subscriptions", "Shopping", "Health", "Entertainment", "Travel",
  "Income", "Transfers", "Other",
];

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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function checkAuth(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token && env.API_SECRET && token === env.API_SECRET;
}

async function upsertCategory(db, category) {
  if (!category) return;
  await db.prepare("INSERT OR IGNORE INTO categories (category) VALUES (?)").bind(category).run();
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function callGemini(env, model, { systemInstruction, contents, responseSchema }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const body = {
    contents,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
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

// ── Transactions ────────────────────────────────────────────────

async function listTransactions(request, env) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  const category = url.searchParams.get("category");
  const currency = url.searchParams.get("currency");

  let query = "SELECT * FROM transactions WHERE 1=1";
  const params = [];
  if (month) {
    query += " AND date LIKE ?";
    params.push(`${month}%`);
  }
  if (category) {
    query += " AND category = ?";
    params.push(category);
  }
  if (currency) {
    query += " AND currency = ?";
    params.push(currency);
  }
  query += " ORDER BY date DESC, createdAt DESC";

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return json(results);
}

async function createTransaction(request, env) {
  const body = await request.json();
  const {
    date, merchant, category, type, amount, currency,
    notes = null, source = null,
  } = body;

  if (!date || !merchant || !category || !type || amount == null || !currency) {
    return json({ error: "Missing required transaction fields" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await upsertCategory(env.DB, category);
  await env.DB.prepare(
    `INSERT INTO transactions (id, date, merchant, category, type, amount, currency, notes, source, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, date, merchant, category, type, amount, currency, notes, source, createdAt).run();

  return json({ id, date, merchant, category, type, amount, currency, notes, source, createdAt }, 201);
}

async function updateTransaction(request, env, id) {
  const body = await request.json();
  const existing = await env.DB.prepare("SELECT * FROM transactions WHERE id = ?").bind(id).first();
  if (!existing) return json({ error: "Transaction not found" }, 404);

  const merged = { ...existing, ...body, id };
  await upsertCategory(env.DB, merged.category);
  await env.DB.prepare(
    `UPDATE transactions SET date=?, merchant=?, category=?, type=?, amount=?, currency=?, notes=?, source=?
     WHERE id=?`
  ).bind(
    merged.date, merged.merchant, merged.category, merged.type,
    merged.amount, merged.currency, merged.notes, merged.source, id
  ).run();

  return json(merged);
}

async function deleteTransaction(env, id) {
  const result = await env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();
  if (result.meta.changes === 0) return json({ error: "Transaction not found" }, 404);
  return json({ ok: true });
}

async function listCategories(env) {
  const { results } = await env.DB.prepare("SELECT category FROM categories ORDER BY category").all();
  return json(results.map((r) => r.category));
}

// ── AI routes ────────────────────────────────────────────────────

async function chatParse(request, env) {
  const { text } = await request.json();
  if (!text) return json({ error: "Missing text" }, 400);

  const month = currentMonth();
  const { results: monthTx } = await env.DB.prepare(
    "SELECT date, merchant, category, type, amount, currency FROM transactions WHERE date LIKE ? ORDER BY date DESC"
  ).bind(`${month}%`).all();

  const totals = {};
  for (const t of monthTx) {
    const key = `${t.category} (${t.currency})`;
    totals[key] = (totals[key] || 0) + (t.type === "expense" ? t.amount : -t.amount);
  }

  const systemInstruction = `You are the assistant inside a personal finance tracker app. The user will send a short message. Decide exactly one action:
- "log_transaction": the message describes a purchase or income event to record. Fill "transaction" with your best-effort extraction. Use today's date (${new Date().toISOString().slice(0, 10)}) if no date is mentioned. Pick "category" from this list when it fits: ${CATEGORIES.join(", ")}. Only invent a new category name if nothing fits.
- "answer": the message is a question about their spending/income. Answer it using the transaction data provided below as ground truth. Put the answer in "answer".
- "clarify": the message is ambiguous (e.g. missing amount) and you need more information before logging a transaction. Put your question in "question".
Never guess an amount — if it's missing, use "clarify" instead.

Current month (${month}) transactions:
${JSON.stringify(monthTx)}

Current month category totals (positive = net expense, negative = net income, in each currency):
${JSON.stringify(totals)}`;

  const result = await callGemini(env, "gemini-2.5-flash-lite", {
    systemInstruction,
    contents: [{ role: "user", parts: [{ text }] }],
    responseSchema: CHAT_SCHEMA,
  });

  return json(result);
}

async function statementsFromCsv(request, env) {
  const { rows } = await request.json();
  if (!Array.isArray(rows)) return json({ error: "Missing rows array" }, 400);

  const systemInstruction = `You are extracting bank transactions from parsed CSV rows of a bank/credit-card statement. For each row that represents a real transaction, produce one entry with date (YYYY-MM-DD), merchant, a category from this list when it fits (${CATEGORIES.join(", ")}), type ("expense" or "income"), a positive amount, and currency (assume CAD if not stated). Skip header rows, balance rows, and non-transaction rows.`;

  const result = await callGemini(env, "gemini-2.5-flash", {
    systemInstruction,
    contents: [{ role: "user", parts: [{ text: `CSV rows as JSON:\n${JSON.stringify(rows)}` }] }],
    responseSchema: EXTRACTION_SCHEMA,
  });

  return json(result);
}

async function statementsFromPdf(request, env) {
  const { base64 } = await request.json();
  if (!base64) return json({ error: "Missing base64" }, 400);

  const systemInstruction = `You are extracting bank transactions from a bank/credit-card statement PDF. For each real transaction, produce one entry with date (YYYY-MM-DD), merchant, a category from this list when it fits (${CATEGORIES.join(", ")}), type ("expense" or "income"), a positive amount, and currency (assume CAD if not stated). Skip summary/balance lines.`;

  const result = await callGemini(env, "gemini-2.5-flash", {
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

  return json(result);
}

// ── Router ───────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (!pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    if (!checkAuth(request, env)) {
      return json({ error: "Unauthorized" }, 401);
    }

    try {
      if (pathname === "/api/test" && method === "GET") {
        await env.DB.prepare("SELECT 1").first();
        return json({ ok: true });
      }

      if (pathname === "/api/transactions" && method === "GET") {
        return await listTransactions(request, env);
      }
      if (pathname === "/api/transactions" && method === "POST") {
        return await createTransaction(request, env);
      }
      const txMatch = pathname.match(/^\/api\/transactions\/([^/]+)$/);
      if (txMatch && method === "PUT") {
        return await updateTransaction(request, env, txMatch[1]);
      }
      if (txMatch && method === "DELETE") {
        return await deleteTransaction(env, txMatch[1]);
      }

      if (pathname === "/api/categories" && method === "GET") {
        return await listCategories(env);
      }

      if (pathname === "/api/chat/parse" && method === "POST") {
        return await chatParse(request, env);
      }
      if (pathname === "/api/statements/csv" && method === "POST") {
        return await statementsFromCsv(request, env);
      }
      if (pathname === "/api/statements/pdf" && method === "POST") {
        return await statementsFromPdf(request, env);
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json({ error: err.message || "Internal error" }, 500);
    }
  },
};
