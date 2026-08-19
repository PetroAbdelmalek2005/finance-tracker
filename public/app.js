// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════

const state = {
  secret: localStorage.getItem("ft_secret") || "",
  transactions: [],
  categories: [],
  activeTab: "tab-chat",
};

let chart = null;

const TEAL = "#2dd4bf";
const AMBER = "#f5a524";

// ═══════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.secret}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    state.secret = "";
    localStorage.removeItem("ft_secret");
    showGate("Wrong key. Try again.");
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════
// AUTH GATE
// ═══════════════════════════════════════════════

function showGate(errorMsg) {
  document.getElementById("app").hidden = true;
  document.getElementById("gate").hidden = false;
  const err = document.getElementById("gate-error");
  if (errorMsg) {
    err.textContent = errorMsg;
    err.hidden = false;
  } else {
    err.hidden = true;
  }
}

async function tryEnterApp() {
  if (!state.secret) {
    showGate();
    return;
  }
  try {
    await api("/api/test");
    document.getElementById("gate").hidden = true;
    document.getElementById("app").hidden = false;
    await bootstrapData();
  } catch {
    // showGate already called by api() on 401; other errors: keep gate up with generic message
    showGate("Could not connect. Check the key and try again.");
  }
}

document.getElementById("gate-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = document.getElementById("gate-input").value.trim();
  if (!value) return;
  state.secret = value;
  localStorage.setItem("ft_secret", value);
  await tryEnterApp();
});

// ═══════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════

async function bootstrapData() {
  await Promise.all([loadTransactions(), loadCategories()]);
  renderTicker();
  renderMonthFilter();
  renderCategoryFilter();
  renderTxList();
  addAssistantMessage("Hi! Tell me about a purchase or ask about your spending.");
}

async function loadTransactions() {
  state.transactions = await api("/api/transactions");
}

async function loadCategories() {
  state.categories = await api("/api/categories");
}

// ═══════════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════════

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.id === tabId));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));
  if (tabId === "tab-dashboard") renderChart();
}

// ═══════════════════════════════════════════════
// TICKER TAPE
// ═══════════════════════════════════════════════

function renderTicker() {
  const ticker = document.getElementById("ticker");
  const recent = [...state.transactions]
    .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt))
    .slice(0, 15);

  if (recent.length === 0) {
    ticker.innerHTML = `<span class="ticker-item">No transactions yet</span>`;
    return;
  }

  const itemHtml = (t) => `
    <span class="ticker-item">
      <span class="merchant">${escapeHtml(t.merchant)}</span>
      <span class="amt ${t.type}">${t.type === "income" ? "+" : "-"}${formatMoney(t.amount, t.currency)}</span>
    </span>`;

  // duplicate content so the translateX(-50%) marquee loops seamlessly
  const html = recent.map(itemHtml).join("");
  ticker.innerHTML = html + html;
}

// ═══════════════════════════════════════════════
// CHAT TAB
// ═══════════════════════════════════════════════

const chatThread = document.getElementById("chat-thread");

function addUserMessage(text) {
  const el = document.createElement("div");
  el.className = "msg msg-user";
  el.textContent = text;
  chatThread.appendChild(el);
  chatThread.scrollTop = chatThread.scrollHeight;
}

function addAssistantMessage(text) {
  const el = document.createElement("div");
  el.className = "msg msg-assistant";
  el.textContent = text;
  chatThread.appendChild(el);
  chatThread.scrollTop = chatThread.scrollHeight;
}

function categoryOptionsHtml(selected) {
  const cats = state.categories.includes(selected) ? state.categories : [selected, ...state.categories];
  return cats.map((c) => `<option value="${escapeHtml(c)}" ${c === selected ? "selected" : ""}>${escapeHtml(c)}</option>`).join("");
}

function addConfirmCard(transaction) {
  const card = document.createElement("div");
  card.className = "confirm-card";
  const t = {
    date: transaction.date || new Date().toISOString().slice(0, 10),
    merchant: transaction.merchant || "",
    category: transaction.category || "Other",
    type: transaction.type || "expense",
    amount: transaction.amount ?? "",
    currency: transaction.currency || "CAD",
    notes: transaction.notes || "",
  };

  card.innerHTML = `
    <h4>Confirm transaction</h4>
    <div class="confirm-field"><label>Merchant</label><input type="text" class="f-merchant" value="${escapeHtml(t.merchant)}" /></div>
    <div class="confirm-field"><label>Category</label><select class="f-category">${categoryOptionsHtml(t.category)}</select></div>
    <div class="confirm-field"><label>Type</label>
      <select class="f-type">
        <option value="expense" ${t.type === "expense" ? "selected" : ""}>Expense</option>
        <option value="income" ${t.type === "income" ? "selected" : ""}>Income</option>
      </select>
    </div>
    <div class="confirm-field"><label>Amount</label><input type="number" step="0.01" class="f-amount" value="${t.amount}" /></div>
    <div class="confirm-field"><label>Currency</label>
      <select class="f-currency">
        ${["CAD", "USD", "EUR", "GBP"].map((c) => `<option value="${c}" ${c === t.currency ? "selected" : ""}>${c}</option>`).join("")}
      </select>
    </div>
    <div class="confirm-field"><label>Date</label><input type="date" class="f-date" value="${t.date}" /></div>
    <div class="confirm-field"><label>Notes</label><input type="text" class="f-notes" value="${escapeHtml(t.notes)}" /></div>
    <div class="confirm-actions">
      <button type="button" class="btn-cancel">Cancel</button>
      <button type="button" class="btn-save">Save</button>
    </div>
  `;

  card.querySelector(".btn-cancel").addEventListener("click", () => card.remove());
  card.querySelector(".btn-save").addEventListener("click", async () => {
    const payload = {
      merchant: card.querySelector(".f-merchant").value.trim(),
      category: card.querySelector(".f-category").value,
      type: card.querySelector(".f-type").value,
      amount: parseFloat(card.querySelector(".f-amount").value),
      currency: card.querySelector(".f-currency").value,
      date: card.querySelector(".f-date").value,
      notes: card.querySelector(".f-notes").value.trim() || null,
      source: "chat",
    };
    if (!payload.merchant || !payload.amount || !payload.date) {
      alert("Merchant, amount, and date are required.");
      return;
    }
    try {
      await api("/api/transactions", { method: "POST", body: JSON.stringify(payload) });
      card.remove();
      addAssistantMessage(`Logged ${payload.type === "income" ? "+" : "-"}${formatMoney(payload.amount, payload.currency)} at ${payload.merchant}.`);
      await loadTransactions();
      await loadCategories();
      renderTicker();
      renderCategoryFilter();
      renderTxList();
    } catch (err) {
      alert(err.message);
    }
  });

  chatThread.appendChild(card);
  chatThread.scrollTop = chatThread.scrollHeight;
}

document.getElementById("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  addUserMessage(text);

  try {
    const result = await api("/api/chat/parse", { method: "POST", body: JSON.stringify({ text }) });
    if (result.action === "log_transaction" && result.transaction) {
      addConfirmCard(result.transaction);
    } else if (result.action === "answer") {
      addAssistantMessage(result.answer || "…");
    } else if (result.action === "clarify") {
      addAssistantMessage(result.question || "Could you clarify that?");
    } else {
      addAssistantMessage("I didn't quite catch that.");
    }
  } catch (err) {
    addAssistantMessage(`Error: ${err.message}`);
  }
});

// ═══════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════

function renderMonthFilter() {
  const select = document.getElementById("filter-month");
  const months = [...new Set(state.transactions.map((t) => t.date.slice(0, 7)))].sort().reverse();
  const current = select.value;
  select.innerHTML = `<option value="">All months</option>` + months.map((m) => `<option value="${m}">${formatMonthLabel(m)}</option>`).join("");
  select.value = months.includes(current) ? current : "";
}

function renderCategoryFilter() {
  const select = document.getElementById("filter-category");
  const current = select.value;
  select.innerHTML = `<option value="">All categories</option>` + state.categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  select.value = state.categories.includes(current) ? current : "";
}

async function applyFilters() {
  const month = document.getElementById("filter-month").value;
  const category = document.getElementById("filter-category").value;
  const currency = document.getElementById("filter-currency").value;
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (category) params.set("category", category);
  if (currency) params.set("currency", currency);
  const query = params.toString();
  const filtered = await api(`/api/transactions${query ? `?${query}` : ""}`);
  renderTxList(filtered);
  renderChart(filtered);
}

["filter-month", "filter-category", "filter-currency"].forEach((id) => {
  document.getElementById(id).addEventListener("change", applyFilters);
});

function renderTxList(list) {
  const rows = list || state.transactions;
  const container = document.getElementById("tx-list");
  container.innerHTML = "";
  if (rows.length === 0) {
    container.innerHTML = `<p style="color:var(--text-dim)">No transactions.</p>`;
    return;
  }
  const sorted = [...rows].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  for (const t of sorted) {
    container.appendChild(buildTxRow(t));
  }
}

function buildTxRow(t) {
  const row = document.createElement("div");
  row.className = "tx-row";
  row.innerHTML = `
    <div class="tx-main">
      <span class="tx-merchant">${escapeHtml(t.merchant)}</span>
      <span class="tx-meta">${t.date} • ${escapeHtml(t.category)} • ${t.currency}</span>
    </div>
    <span class="tx-amount ${t.type}">${t.type === "income" ? "+" : "-"}${formatMoney(t.amount, t.currency)}</span>
    <button type="button" class="tx-delete">✕</button>
  `;

  row.querySelector(".tx-delete").addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${t.merchant}"?`)) return;
    await api(`/api/transactions/${t.id}`, { method: "DELETE" });
    await loadTransactions();
    renderTicker();
    renderMonthFilter();
    renderTxList();
    if (state.activeTab === "tab-dashboard") renderChart();
  });

  row.addEventListener("click", () => openTxEdit(row, t));

  return row;
}

function openTxEdit(row, t) {
  row.innerHTML = "";
  row.classList.add("editing");
  const form = document.createElement("div");
  form.className = "tx-edit-form";
  form.innerHTML = `
    <input type="text" class="e-merchant full" value="${escapeHtml(t.merchant)}" placeholder="Merchant" />
    <select class="e-category">${categoryOptionsHtml(t.category)}</select>
    <select class="e-type">
      <option value="expense" ${t.type === "expense" ? "selected" : ""}>Expense</option>
      <option value="income" ${t.type === "income" ? "selected" : ""}>Income</option>
    </select>
    <input type="number" step="0.01" class="e-amount" value="${t.amount}" />
    <select class="e-currency">
      ${["CAD", "USD", "EUR", "GBP"].map((c) => `<option value="${c}" ${c === t.currency ? "selected" : ""}>${c}</option>`).join("")}
    </select>
    <input type="date" class="e-date" value="${t.date}" />
    <input type="text" class="e-notes full" value="${escapeHtml(t.notes || "")}" placeholder="Notes" />
    <div class="tx-edit-actions">
      <button type="button" class="btn-cancel">Cancel</button>
      <button type="button" class="btn-save">Save</button>
    </div>
  `;
  form.addEventListener("click", (e) => e.stopPropagation());

  form.querySelector(".btn-cancel").addEventListener("click", () => renderTxList());

  form.querySelector(".btn-save").addEventListener("click", async () => {
    const payload = {
      merchant: form.querySelector(".e-merchant").value.trim(),
      category: form.querySelector(".e-category").value,
      type: form.querySelector(".e-type").value,
      amount: parseFloat(form.querySelector(".e-amount").value),
      currency: form.querySelector(".e-currency").value,
      date: form.querySelector(".e-date").value,
      notes: form.querySelector(".e-notes").value.trim() || null,
    };
    await api(`/api/transactions/${t.id}`, { method: "PUT", body: JSON.stringify(payload) });
    await loadTransactions();
    await loadCategories();
    renderTicker();
    renderMonthFilter();
    renderCategoryFilter();
    renderTxList();
    if (state.activeTab === "tab-dashboard") renderChart();
  });

  row.appendChild(form);
}

function renderChart(list) {
  const rows = list || state.transactions;
  const totals = {};
  for (const t of rows) {
    if (!totals[t.category]) totals[t.category] = { expense: 0, income: 0 };
    totals[t.category][t.type] += t.amount;
  }
  const labels = Object.keys(totals).sort();
  const expenseData = labels.map((c) => totals[c].expense);
  const incomeData = labels.map((c) => totals[c].income);

  const ctx = document.getElementById("category-chart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Expense", data: expenseData, backgroundColor: AMBER },
        { label: "Income", data: incomeData, backgroundColor: TEAL },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#e8eaed" } } },
      scales: {
        x: { ticks: { color: "#8b939e" }, grid: { color: "#262b31" } },
        y: { ticks: { color: "#8b939e" }, grid: { color: "#262b31" } },
      },
    },
  });
}

// ═══════════════════════════════════════════════
// STATEMENTS TAB
// ═══════════════════════════════════════════════

const statementStatus = document.getElementById("statement-status");
const reconcileResults = document.getElementById("reconcile-results");

document.getElementById("csv-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  statementStatus.textContent = "Parsing CSV…";
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      statementStatus.textContent = "Extracting transactions with Gemini…";
      try {
        const { transactions } = await api("/api/statements/csv", {
          method: "POST",
          body: JSON.stringify({ rows: results.data }),
        });
        statementStatus.textContent = `Extracted ${transactions.length} transaction(s) from CSV.`;
        renderReconciliation(transactions);
      } catch (err) {
        statementStatus.textContent = `Error: ${err.message}`;
      }
    },
  });
  e.target.value = "";
});

document.getElementById("pdf-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  statementStatus.textContent = "Reading PDF…";
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(",")[1];
    statementStatus.textContent = "Extracting transactions with Gemini…";
    try {
      const { transactions } = await api("/api/statements/pdf", {
        method: "POST",
        body: JSON.stringify({ base64 }),
      });
      statementStatus.textContent = `Extracted ${transactions.length} transaction(s) from PDF.`;
      renderReconciliation(transactions);
    } catch (err) {
      statementStatus.textContent = `Error: ${err.message}`;
    }
  };
  reader.readAsDataURL(file);
  e.target.value = "";
});

function reconcileStatement(extracted) {
  if (extracted.length === 0) return { matched: [], missing: [], extra: [] };
  const times = extracted.map((t) => new Date(t.date).getTime());
  const minDate = new Date(Math.min(...times) - 3 * 86400000);
  const maxDate = new Date(Math.max(...times) + 3 * 86400000);
  const candidates = state.transactions.filter((t) => {
    const d = new Date(t.date).getTime();
    return d >= minDate.getTime() && d <= maxDate.getTime();
  });

  const usedIds = new Set();
  const matched = [];
  const missing = [];
  for (const ext of extracted) {
    const match = candidates.find(
      (e) => !usedIds.has(e.id) && Math.abs(e.amount - ext.amount) < 0.01 && daysBetween(e.date, ext.date) <= 3
    );
    if (match) {
      usedIds.add(match.id);
      matched.push(match);
    } else {
      missing.push(ext);
    }
  }
  const extra = candidates.filter((e) => !usedIds.has(e.id));
  return { matched, missing, extra };
}

function renderReconciliation(extracted) {
  const { matched, missing, extra } = reconcileStatement(extracted);
  reconcileResults.innerHTML = "";

  reconcileResults.appendChild(buildReconcileGroup("Matched", matched));
  const missingGroup = buildReconcileGroup("Missing (in statement, not logged)", missing);
  if (missing.length > 0) {
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "add-missing-btn";
    addBtn.textContent = `Add ${missing.length} missing transaction(s)`;
    addBtn.addEventListener("click", async () => {
      addBtn.disabled = true;
      addBtn.textContent = "Adding…";
      for (const t of missing) {
        await api("/api/transactions", {
          method: "POST",
          body: JSON.stringify({ ...t, source: "statement" }),
        });
      }
      await loadTransactions();
      await loadCategories();
      renderTicker();
      renderMonthFilter();
      renderCategoryFilter();
      renderTxList();
      statementStatus.textContent = "Missing transactions added.";
      reconcileResults.innerHTML = "";
    });
    missingGroup.appendChild(addBtn);
  }
  reconcileResults.appendChild(missingGroup);
  reconcileResults.appendChild(buildReconcileGroup("Extra (logged, not in statement)", extra));
}

function buildReconcileGroup(title, rows) {
  const group = document.createElement("div");
  group.className = "reconcile-group";
  const heading = document.createElement("h3");
  heading.textContent = `${title} (${rows.length})`;
  group.appendChild(heading);
  const list = document.createElement("div");
  list.className = "tx-list";
  if (rows.length === 0) {
    list.innerHTML = `<p style="color:var(--text-dim); font-size:0.85rem;">None</p>`;
  } else {
    for (const t of rows) {
      const row = document.createElement("div");
      row.className = "tx-row";
      row.style.cursor = "default";
      row.innerHTML = `
        <div class="tx-main">
          <span class="tx-merchant">${escapeHtml(t.merchant)}</span>
          <span class="tx-meta">${t.date} • ${escapeHtml(t.category)} • ${t.currency}</span>
        </div>
        <span class="tx-amount ${t.type}">${t.type === "income" ? "+" : "-"}${formatMoney(t.amount, t.currency)}</span>
      `;
      list.appendChild(row);
    }
  }
  group.appendChild(list);
  return group;
}

// ═══════════════════════════════════════════════
// UTIL
// ═══════════════════════════════════════════════

function formatMoney(amount, currency) {
  return `${Number(amount).toFixed(2)} ${currency}`;
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function daysBetween(d1, d2) {
  return Math.abs((new Date(d1).getTime() - new Date(d2).getTime()) / 86400000);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════

tryEnterApp();
