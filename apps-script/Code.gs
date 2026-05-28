/**
 * Code.gs — AI Bookkeeping (Free Edition)
 *
 * Core interaction:
 *   1. Quick Entry sidebar — fastest way to log expenses
 *   2. Type in Description column → select row → Smart Entry
 *
 * Free edition limit: 50 entries. Upgrade at tallyai.etsy.com for unlimited.
 */

// ── UI strings (English only in free edition) ──
const S = {
  menu_title: '📋 AI Bookkeeping',
  menu_quick_entry: '⚡ Quick Entry',
  menu_smart_entry: '🤖 Smart Entry',
  menu_report: '📊 Monthly Summary',
  menu_help: '❓ How to Use',
  sidebar_title: '🤖 AI Quick Entry',
  toast_processing: '🤖 Processing...',
  toast_summary: '✅ {n} entries processed, {e} errors',
  toast_result: '✅ {desc} → {amt} · {cat}',
  toast_error: '⚠️ Error: {msg}',
  toast_limit: '📋 Free edition: {n}/50 entries used. Upgrade at tallyai.etsy.com',
  toast_offline: '📡 Offline mode — AI will categorize locally',
  error_no_entries: 'No entries found. Type a description in column B first.',
  error_enter_desc: 'Please enter a description.',
  error_no_parse: 'Could not parse. Try "coffee 4.50" format.',
  error_sheet: 'Sheet not found. The template may need reinstallation.',
  flag_low: '🔍 Low confidence',
  flag_offline: '📡 Offline — verify entries',
  help_title: 'AI Bookkeeping Help',
  help_text: 'How to use:\n\n1. Open AI Bookkeeping → Quick Entry\n2. Type expenses like "coffee 4.50"\n3. Press Enter — AI handles the rest\n\nOr type descriptions in column B, then select the row and click Smart Entry.\n\nFree edition: up to 50 entries.\nUpgrade for unlimited: tallyai.etsy.com',
  status_ready: 'Ready',
  status_label: 'Status:',
  status_limit: '⚠️ {n}/50 entries',
  hdr_date: 'Date',
  hdr_desc: 'Description',
  hdr_amount: 'Amount',
  hdr_cat: 'Category',
  hdr_notes: 'Notes',
  hdr_flags: 'Flags',
  hdr_ts: 'Entered At',
  s_j_title: '📋 AI Bookkeeping',
  s_d_title: '📊 Dashboard',
  s_c_title: '📂 Categories',
  s_s_title: '⚙️ Settings',
  db_this_month: 'This Month',
  db_total_spent: '💵 Total Spent',
  db_total_entries: '📝 Total Entries',
  db_avg_entry: '📈 Avg per Entry',
  db_cat_breakdown: 'Category Breakdown',
  db_category: 'Category',
  db_amount: 'Amount',
  db_count: 'Count',
  db_pct: '%',
  db_report_hint: 'Open AI Bookkeeping → Monthly Summary for insights.',
  cat_header_cat: 'Category',
  cat_header_keywords: 'Keywords (AI uses these)',
  cat_note: 'Add or remove categories. AI adapts automatically.',
  st_license: 'License',
  st_status: 'Status',
  st_threshold: 'Confidence Threshold',
  st_note_threshold: 'Entries below this threshold are flagged for review (0.0 - 1.0)',
  dv_cat_help: 'Select a category. Add custom ones in Categories sheet.',
  desc_note: 'Type naturally.\nExamples:\n• "coffee 4.50"\n• "lunch 32.50"\nThen use AI Bookkeeping → Smart Entry.',
  alert_limit_title: '📋 Free Edition Limit',
  alert_limit_body: 'You\'ve reached 50 entries. Upgrade for unlimited entries:\n\ntallyai.etsy.com',
  about_title: 'About AI Bookkeeping',
  about_body: 'AI Smart Bookkeeping\nVersion: Free Edition 1.0\n\nPowered by AI categorization.\nUpgrade for unlimited entries, CSV import, multi-currency, and more.\n\ntallyai.etsy.com',
};

function _(key) { return S[key] || key; }

const FREE_LIMIT = 50;

// ── Menu setup ──
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(S.menu_title)
    .addItem(S.menu_quick_entry, 'showSidebar')
    .addItem(S.menu_smart_entry, 'processSelectedRow')
    .addSeparator()
    .addItem(S.menu_report, 'showMonthlySummary')
    .addSeparator()
    .addItem(S.menu_help, 'showHelp')
    .addItem('About', 'showAbout')
    .addToUi();

  initializeSheets();
}

// ── Sidebar ──
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle(_('sidebar_title'))
    .setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ── Smart Entry (selected row) ──
function processSelectedRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  if (sheet.getName() !== 'Journal') {
    SpreadsheetApp.getUi().alert('Switch to the Journal sheet first.');
    return;
  }

  const row = ss.getActiveCell().getRow();
  if (row < 3) return;

  const desc = String(sheet.getRange(row, 2).getValue()).trim();
  if (!desc) {
    SpreadsheetApp.getUi().alert(_('error_enter_desc'));
    return;
  }

  processRow(sheet, row, desc);
}

// ── Process a single row ──
function processRow(sheet, row, desc) {
  // Check entry count limit
  const count = countEntries();
  if (count >= FREE_LIMIT) {
    SpreadsheetApp.getUi().alert(_('alert_limit_title'), _('alert_limit_body'), SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  try {
    const result = callClassify(desc, 'free');
    const entry = Array.isArray(result) ? result[0] : result;

    sheet.getRange(row, 1).setValue(entry.date || new Date());
    sheet.getRange(row, 2).setValue(desc);
    sheet.getRange(row, 3).setValue(entry.amount || 0);
    sheet.getRange(row, 4).setValue(entry.category || 'Other');
    sheet.getRange(row, 5).setValue(entry.notes || '');
    sheet.getRange(row, 6).setValue(entry.flag || (entry.confidence < 0.5 ? _('flag_low') : ''));
    sheet.getRange(row, 7).setValue(new Date());

    // Update banner with count
    const newCount = countEntries();
    updateBanner(newCount);

    return JSON.stringify({ ok: true, count: newCount, limit: FREE_LIMIT });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

// ── Entry counter ──
function countEntries() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Journal');
  if (!sheet) return 0;
  const data = sheet.getRange(3, 2, 500, 1).getValues();
  return data.filter(function(r) { return String(r[0]).trim(); }).length;
}

function updateBanner(count) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Journal');
    if (!sheet) return;
    const remaining = Math.max(0, FREE_LIMIT - count);
    sheet.getRange('E1').setValue(_('status_label'));
    if (remaining <= 10) {
      sheet.getRange('F1').setValue('⚠️ ' + remaining + '/50 entries remaining').setFontColor('#c0392b');
    } else {
      sheet.getRange('F1').setValue('✅ ' + remaining + '/50 entries remaining').setFontColor('#2d5a3f');
    }
  } catch(e) { /* silent */ }
}

// ── Process all unprocessed rows ──
function processAllRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Journal');
  if (!sheet) { return _('error_sheet'); }

  const data = sheet.getRange(3, 1, 500, 7).getValues();
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < data.length; i++) {
    const desc = String(data[i][1]).trim();
    const hasCategory = String(data[i][3]).trim();
    if (!desc || hasCategory) continue;

    const count = countEntries();
    if (count >= FREE_LIMIT) break;

    try {
      const result = callClassify(desc, 'free');
      const entry = Array.isArray(result) ? result[0] : result;
      const row = 3 + i;
      sheet.getRange(row, 1).setValue(entry.date || new Date());
      sheet.getRange(row, 3).setValue(entry.amount || 0);
      sheet.getRange(row, 4).setValue(entry.category || 'Other');
      sheet.getRange(row, 5).setValue(entry.notes || '');
      sheet.getRange(row, 6).setValue(entry.flag || '');
      sheet.getRange(row, 7).setValue(new Date());
      processed++;
    } catch (e) {
      errors++;
    }
  }

  updateBanner(countEntries());
  return _('toast_summary').replace('{n}', processed).replace('{e}', errors);
}

// ── Quick Entry API (called from Sidebar) ──
function quickEntry(text) {
  if (!text || !text.trim()) {
    return JSON.stringify({ error: _('error_enter_desc') });
  }

  const count = countEntries();
  if (count >= FREE_LIMIT) {
    return JSON.stringify({
      error: 'limit',
      msg: _('alert_limit_body'),
      count: count,
      limit: FREE_LIMIT
    });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Journal');
  if (!sheet) return JSON.stringify({ error: _('error_sheet') });

  const nextRow = sheet.getRange(3, 1, 500, 1).getValues()
    .reduceRight(function(acc, r, i) {
      return acc === -1 && String(r[0]).trim() ? i + 3 : acc;
    }, -1) + 1;

  const result = callClassify(text, 'free');
  const entry = Array.isArray(result) ? result[0] : result;

  sheet.getRange(nextRow, 1).setValue(entry.date || new Date());
  sheet.getRange(nextRow, 2).setValue(text.trim());
  sheet.getRange(nextRow, 3).setValue(entry.amount || 0);
  sheet.getRange(nextRow, 4).setValue(entry.category || 'Other');
  sheet.getRange(nextRow, 5).setValue(entry.notes || '');
  sheet.getRange(nextRow, 6).setValue(entry.flag || (entry.confidence < 0.5 ? _('flag_low') : ''));
  sheet.getRange(nextRow, 7).setValue(new Date());

  const newCount = countEntries();
  updateBanner(newCount);

  return JSON.stringify({
    ok: true,
    row: nextRow,
    result: entry,
    count: newCount,
    limit: FREE_LIMIT
  });
}

// ── Monthly Summary (offline, built from sheet data) ──
function showMonthlySummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Journal');
  if (!sheet) { SpreadsheetApp.getUi().alert(_('error_sheet')); return; }

  const data = sheet.getRange(3, 1, 500, 7).getValues();
  const entries = data.filter(function(r) { return String(r[1]).trim(); });

  if (entries.length === 0) {
    SpreadsheetApp.getUi().alert('No entries yet. Start by typing expenses in the Journal.');
    return;
  }

  // Calculate summary
  var totals = {};
  var total = 0;
  entries.forEach(function(r) {
    var cat = String(r[3]).trim() || 'Other';
    var amt = parseFloat(r[2]) || 0;
    totals[cat] = (totals[cat] || 0) + amt;
    total += amt;
  });

  var sorted = Object.entries(totals).sort(function(a, b) { return b[1] - a[1]; });
  var topCats = sorted.slice(0, 5).map(function(c) {
    return c[0] + ': $' + c[1].toFixed(2) + ' (' + (total > 0 ? (c[1]/total*100).toFixed(0) : 0) + '%)';
  }).join('\n');

  var html = '<b>Monthly Summary</b><br><br>' +
    'Total: <b>$' + total.toFixed(2) + '</b><br>' +
    'Entries: ' + entries.length + '<br><br>' +
    '<b>Top Categories:</b><br>' + topCats.replace(/\n/g, '<br>') + '<br><br>' +
    '<span style="color:#888;font-size:0.9em;">Upgrade for AI-powered insights with charts and trends: <a href="https://tallyai.etsy.com">tallyai.etsy.com</a></span>';

  var output = HtmlService.createHtmlOutput(html)
    .setWidth(400)
    .setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(output, '📊 Monthly Summary');
}

// ── Dialogs ──
function showHelp() {
  SpreadsheetApp.getUi().alert(_('help_title'), _('help_text'), SpreadsheetApp.getUi().ButtonSet.OK);
}

function showAbout() {
  SpreadsheetApp.getUi().alert(_('about_title'), _('about_body'), SpreadsheetApp.getUi().ButtonSet.OK);
}
