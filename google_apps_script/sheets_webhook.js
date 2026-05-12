/**
 * FINSTAR Inventory Google Sheets → Website Sync
 * ================================================
 * Install this script in your Google Sheet via:
 *   Extensions → Apps Script → paste this code → Save → Deploy as web app (or use onEdit trigger)
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Click Extensions → Apps Script
 * 3. Replace any existing code with this entire file
 * 4. Update the CONFIG section below with your values
 * 5. Click Save (💾)
 * 6. Click Run → installEditTrigger  (first time only — grants permission)
 * 7. Accept the permission prompt
 *
 * COLUMN MAPPING (must match your sheet structure):
 *   Col A (1): Product Name
 *   Col B (2): SKU          ← sync key
 *   Col C (3): Category
 *   Col D (4): Quantity In Stock
 *   Col E (5): Unit
 *   Col F (6): Cost Price
 *   Col G (7): Selling Price
 *   Col H (8): Reorder Level
 *   Col I (9): Stock Status
 *   Col J (10): Last Updated
 */

// ── CONFIG — update these values ─────────────────────────────────────────────

var CONFIG = {
  // Your Django backend URL (must be publicly reachable — NOT localhost)
  // For local testing use: https://YOUR-NGROK-ID.ngrok-free.app
  // For production use:    https://api.finstarindustrials.com
  WEBHOOK_URL: "https://YOUR-BACKEND-URL/api/inventory/google-sync/",

  // Must match SHEETS_WEBHOOK_SECRET in your .env file exactly
  WEBHOOK_SECRET: "75d80817631920ba4030315291379f34af4d6b649626f9eba0390cd17032f559",

  // Name of the tab this script watches
  WATCHED_TAB: "Standalone Inventory",

  // Column indices (1-based) that trigger a webhook when edited
  SYNC_COLUMNS: {
    SKU: 2,           // Col B — used as the sync key (never sync on SKU edit)
    QUANTITY: 4,      // Col D — Quantity In Stock
    COST_PRICE: 6,    // Col F — Cost Price
    SELL_PRICE: 7,    // Col G — Selling Price
    REORDER_LEVEL: 8, // Col H — Reorder Level
  },

  // Timeout for HTTP requests (milliseconds)
  REQUEST_TIMEOUT_MS: 10000,
};

// ── Column indices that should trigger a webhook when edited ──────────────────
var EDITABLE_COLS = [
  CONFIG.SYNC_COLUMNS.QUANTITY,
  CONFIG.SYNC_COLUMNS.COST_PRICE,
  CONFIG.SYNC_COLUMNS.SELL_PRICE,
  CONFIG.SYNC_COLUMNS.REORDER_LEVEL,
];

// ── Main edit trigger ─────────────────────────────────────────────────────────

/**
 * Automatically triggered by Google Sheets when ANY cell is edited by a human.
 * NOTE: This does NOT fire when the Django backend writes to the sheet via the
 * Sheets API — which is the primary loop-prevention mechanism.
 */
function onEdit(e) {
  try {
    var sheet = e.range.getSheet();

    // Only watch the configured tab
    if (sheet.getName() !== CONFIG.WATCHED_TAB) return;

    var row = e.range.getRow();
    var col = e.range.getColumn();

    // Row 1 is the header row — ignore edits to it
    if (row <= 1) return;

    // Only sync when a relevant column was edited
    if (EDITABLE_COLS.indexOf(col) === -1) return;

    // Read the SKU from column B on this row
    var sku = sheet.getRange(row, CONFIG.SYNC_COLUMNS.SKU).getValue();
    if (!sku || String(sku).trim() === "") {
      Logger.log("[FINSTAR Sync] Row " + row + " has no SKU — skipping webhook.");
      return;
    }
    sku = String(sku).trim();

    // Build the payload — only include the edited field
    var payload = { sku: sku };
    var fieldName = _colToFieldName(col);
    if (!fieldName) return;

    var newValue = e.range.getValue();
    if (newValue === "" || newValue === null) return;  // ignore cell clears

    payload[fieldName] = Number(newValue);

    Logger.log("[FINSTAR Sync] Sending webhook | SKU=" + sku + " field=" + fieldName + " value=" + newValue);

    var result = _sendWebhook(payload);
    if (result.ok) {
      Logger.log("[FINSTAR Sync] ✅ Success | SKU=" + sku + " | response=" + result.body);
    } else {
      Logger.log("[FINSTAR Sync] ❌ Error | SKU=" + sku + " | status=" + result.status + " | body=" + result.body);
    }

  } catch (err) {
    Logger.log("[FINSTAR Sync] Exception in onEdit: " + err.toString());
  }
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function _sendWebhook(payload) {
  try {
    var options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "X-Sheets-Webhook-Secret": CONFIG.WEBHOOK_SECRET,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,  // prevents Apps Script from throwing on 4xx/5xx
    };

    var response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
    var statusCode = response.getResponseCode();
    var body = response.getContentText();

    return { ok: statusCode >= 200 && statusCode < 300, status: statusCode, body: body };
  } catch (err) {
    return { ok: false, status: 0, body: err.toString() };
  }
}

// ── Column → field name mapping ───────────────────────────────────────────────

function _colToFieldName(col) {
  switch (col) {
    case CONFIG.SYNC_COLUMNS.QUANTITY:     return "quantity";
    case CONFIG.SYNC_COLUMNS.COST_PRICE:   return "cost_price";
    case CONFIG.SYNC_COLUMNS.SELL_PRICE:   return "sell_price";
    case CONFIG.SYNC_COLUMNS.REORDER_LEVEL: return "reorder_level";
    default: return null;
  }
}

// ── One-time trigger installer ────────────────────────────────────────────────

/**
 * Run this function ONCE from the Apps Script editor to install the onEdit
 * trigger with the correct permissions (simple onEdit triggers cannot make
 * external HTTP requests — an installable trigger is required).
 *
 * Steps:
 *   1. In the Apps Script editor, select "installEditTrigger" from the dropdown
 *   2. Click Run
 *   3. Accept the Google permissions prompt
 */
function installEditTrigger() {
  // Remove any existing triggers to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "onEdit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Install a new installable onEdit trigger
  ScriptApp.newTrigger("onEdit")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  Logger.log("[FINSTAR Sync] ✅ onEdit trigger installed successfully.");
}

// ── Manual test helper ────────────────────────────────────────────────────────

/**
 * Run this from the Apps Script editor to manually test the webhook.
 * Change the SKU below to any valid SKU from your inventory.
 */
function testWebhook() {
  var testPayload = {
    sku: "FSI-000001",  // change to a real SKU
    quantity: 99,
  };

  Logger.log("[FINSTAR Sync] Running manual webhook test...");
  var result = _sendWebhook(testPayload);

  if (result.ok) {
    Logger.log("[FINSTAR Sync] ✅ Test PASSED | status=" + result.status + " | body=" + result.body);
  } else {
    Logger.log("[FINSTAR Sync] ❌ Test FAILED | status=" + result.status + " | body=" + result.body);
  }
}
