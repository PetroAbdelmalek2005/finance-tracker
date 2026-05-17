/**
 * Budget Tracker — Google Apps Script Sync Backend
 *
 * SETUP:
 * 1. Open your Google Sheet
 * 2. Extensions → Apps Script → paste this entire file
 * 3. Click Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the deployment URL and paste it into the iOS app Settings
 *
 * The script creates/manages these sheets automatically:
 *   - Transactions
 *   - Accounts
 *   - Budgets
 *   - Meta (last sync time, source)
 */

const SHEET_NAMES = {
  transactions: 'Transactions',
  accounts: 'Accounts',
  budgets: 'Budgets',
  meta: 'Meta',
};

// ── Entry Points ──────────────────────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action || 'read';
  if (action === 'read') {
    return respond(readAll());
  }
  return respond({ error: 'Unknown action' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || 'write';
    if (action === 'write') {
      writeAll(body.data);
      return respond({ success: true, timestamp: new Date().toISOString() });
    }
    return respond({ error: 'Unknown action' });
  } catch (err) {
    return respond({ error: err.toString() });
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

function readAll() {
  ensureSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  return {
    transactions: sheetToObjects(ss.getSheetByName(SHEET_NAMES.transactions)),
    accounts: sheetToObjects(ss.getSheetByName(SHEET_NAMES.accounts)),
    budgets: sheetToObjects(ss.getSheetByName(SHEET_NAMES.budgets)),
    lastSynced: getMeta('lastSynced'),
    source: getMeta('source'),
  };
}

// ── Write ─────────────────────────────────────────────────────────────────────

function writeAll(data) {
  ensureSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (data.transactions) {
    objectsToSheet(ss.getSheetByName(SHEET_NAMES.transactions), data.transactions, [
      'id', 'date', 'description', 'merchant', 'amount', 'category',
      'accountId', 'pending', 'reviewed', 'aiCategory', 'aiConfidence', 'notes',
      'plaidTransactionId',
    ]);
  }

  if (data.accounts) {
    objectsToSheet(ss.getSheetByName(SHEET_NAMES.accounts), data.accounts, [
      'id', 'name', 'type', 'balance', 'currency', 'institution', 'mask',
      'plaidAccountId', 'plaidItemId',
    ]);
  }

  if (data.budgets) {
    objectsToSheet(ss.getSheetByName(SHEET_NAMES.budgets), data.budgets, [
      'id', 'category', 'monthlyLimit',
    ]);
  }

  setMeta('lastSynced', data.lastSynced || new Date().toISOString());
  setMeta('source', data.source || 'unknown');
}

// ── Sheet Helpers ─────────────────────────────────────────────────────────────

function ensureSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const name of Object.values(SHEET_NAMES)) {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
    }
  }
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] === '' ? undefined : row[i];
    });
    return obj;
  });
}

function objectsToSheet(sheet, objects, columns) {
  if (!sheet || !objects || objects.length === 0) {
    if (sheet) sheet.clearContents();
    return;
  }
  sheet.clearContents();
  const rows = [columns];
  for (const obj of objects) {
    rows.push(columns.map((c) => (obj[c] !== undefined && obj[c] !== null) ? obj[c] : ''));
  }
  sheet.getRange(1, 1, rows.length, columns.length).setValues(rows);

  // Style header row
  const headerRange = sheet.getRange(1, 1, 1, columns.length);
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#9f67ff');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function getMeta(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.meta);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (const row of data) {
    if (row[0] === key) return row[1];
  }
  return null;
}

function setMeta(key, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.meta);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.meta);

  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
