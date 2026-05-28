/**
 * SheetManager.gs — Sheet structure setup
 *
 * Journal is the core sheet. Dashboard auto-summarizes.
 */

function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const props = PropertiesService.getDocumentProperties();
  if (props.getProperty('_sb_initialized')) return;

  setupJournalSheet(ss);
  setupDashboardSheet(ss);
  setupCategoriesSheet(ss);
  setupSettingsSheet(ss);

  props.setProperty('_sb_initialized', 'true');
}

function setupJournalSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME_JOURNAL);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_JOURNAL);
    ss.setActiveSheet(sheet);
  }

  sheet.getRange('A1').setValue(_('s_j_title')).setFontSize(16).setFontWeight('bold')
    .setFontColor('#c96b3a');
  sheet.getRange('B1').setValue(_('desc_note')).setFontSize(10).setFontColor('#b8b0a0').setFontStyle('italic');
  sheet.getRange('E1').setValue(_('status_label'));
  sheet.getRange('F1').setValue(_('status_ready')).setFontColor('#2d5a3f');

  const headers = [
    _('hdr_date'), _('hdr_desc'), _('hdr_amount'), _('hdr_cat'),
    _('hdr_notes'), _('hdr_flags'), _('hdr_ts')
  ];
  sheet.getRange(ROW_DATA_START - 1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(ROW_DATA_START - 1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground('#0a1628').setFontColor('#ffffff')
    .setHorizontalAlignment('center');
  sheet.getRange(ROW_DATA_START - 1, 1, 1, headers.length)
    .setBorder(true, true, true, true, false, false, '#c96b3a', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  sheet.setFrozenRows(ROW_DATA_START - 1);

  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 360);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 260);
  sheet.setColumnWidth(6, 220);
  sheet.setColumnWidth(7, 160);

  sheet.getRange(ROW_DATA_START, 1, 500, 1).setNumberFormat('M/d');
  sheet.getRange(ROW_DATA_START, 3, 500, 1).setNumberFormat('$#,##0.00');

  const examples = [
    ['5/24', '☕ coffee $4.50', 4.50, 'Food & Drink', 'morning coffee', '', new Date()],
    ['5/23', '🛒 weekly grocery run 85.20', 85.20, 'Groceries', '', '', new Date()],
  ];
  const exampleRange = sheet.getRange(ROW_DATA_START, 1, examples.length, 7);
  exampleRange.setValues(examples);
  exampleRange.setFontColor('#b8b0a0');

  const dataRange = sheet.getRange(ROW_DATA_START + examples.length, 1, 500, 7);
  const stripeRule = SpreadsheetApp.newConditionalFormatRule()
    .setRanges([dataRange])
    .whenFormulaSatisfied('=MOD(ROW(),2)=0')
    .setBackground('#f5f3ef')
    .build();

  sheet.setConditionalFormatRules([stripeRule]);

  sheet.getRange(ROW_DATA_START - 1, 2).setNote(_('desc_note'));

  const catRange = sheet.getRange(ROW_DATA_START, 4, 500, 1);
  const catValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(CATEGORIES, true)
    .setAllowInvalid(true)
    .setHelpText(_('dv_cat_help'))
    .build();
  catRange.setDataValidation(catValidation);
}

function setupDashboardSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME_DASHBOARD);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME_DASHBOARD);

  sheet.getRange('A1').setValue(_('s_d_title')).setFontSize(16).setFontWeight('bold')
    .setFontColor('#c96b3a');
  sheet.getRange('A2').setValue(_('db_this_month'));
  sheet.getRange('B2').setFormula('=TEXT(TODAY(),"MMMM YYYY")').setFontWeight('bold');

  sheet.getRange('A4').setValue(_('db_total_spent')).setFontWeight('bold');
  sheet.getRange('B4').setFormula('=SUM(Journal!C:C)').setNumberFormat('$#,##0.00');

  sheet.getRange('A5').setValue(_('db_total_entries')).setFontWeight('bold');
  sheet.getRange('B5').setFormula('=COUNTA(Journal!B:B)-2');

  sheet.getRange('A6').setValue(_('db_avg_entry')).setFontWeight('bold');
  sheet.getRange('B6').setFormula('=IF(B5=0,0,B4/B5)').setNumberFormat('$#,##0.00');

  sheet.getRange('A8').setValue(_('db_cat_breakdown')).setFontWeight('bold');
  sheet.getRange('A9').setValue(_('db_category'));
  sheet.getRange('B9').setValue(_('db_amount'));
  sheet.getRange('C9').setValue(_('db_count'));
  sheet.getRange('D9').setValue(_('db_pct'));
  sheet.getRange('A9:D9').setFontWeight('bold');

  for (let i = 0; i < CATEGORIES.length; i++) {
    const row = 10 + i;
    sheet.getRange(row, 1).setValue(CATEGORIES[i]);
    sheet.getRange(row, 2).setFormula(
      '=SUMIF(Journal!D:D,"' + CATEGORIES[i] + '",Journal!C:C)'
    ).setNumberFormat('$#,##0.00');
    sheet.getRange(row, 3).setFormula(
      '=COUNTIF(Journal!D:D,"' + CATEGORIES[i] + '")'
    );
    sheet.getRange(row, 4).setFormula(
      '=IF(B4=0,0,B' + row + '/B4)'
    ).setNumberFormat('0.0%');
  }

  const reportRow = 10 + CATEGORIES.length + 2;
  sheet.getRange(reportRow, 1).setValue('📊 Insights').setFontSize(14).setFontWeight('bold');
  sheet.getRange(reportRow + 1, 1, 10, 3).setValue('')
    .setBackground('#f0f0f0')
    .setFontColor('#7a8a9a')
    .setFontStyle('italic');
  sheet.getRange(reportRow + 1, 1).setValue('Open AI Bookkeeping → Monthly Summary from the menu.');
}

function setupCategoriesSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME_CATEGORIES);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME_CATEGORIES);

  sheet.getRange('A1').setValue(_('s_c_title')).setFontSize(14).setFontWeight('bold');
  sheet.getRange('A2').setValue(_('cat_header_cat')).setFontWeight('bold');
  sheet.getRange('B2').setValue(_('cat_header_keywords')).setFontWeight('bold');

  for (let i = 0; i < CATEGORIES.length; i++) {
    sheet.getRange(3 + i, 1).setValue(CATEGORIES[i]);
  }

  sheet.getRange('A3').setNote(_('cat_note'));
}

function setupSettingsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME_SETTINGS);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME_SETTINGS);

  sheet.getRange('A1').setValue(_('s_s_title')).setFontSize(14).setFontWeight('bold');
  sheet.getRange('A2').setValue('Upgrade');
  sheet.getRange('B2').setValue('tallyai.etsy.com');
  sheet.getRange('A3').setValue(_('st_status'));
  sheet.getRange('B3').setValue('✅ Active (Free Edition)');
  sheet.getRange('A4').setValue(_('st_threshold'));
  sheet.getRange('B4').setValue(0.6);
  sheet.getRange('C4').setNote(_('st_note_threshold'));

  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 250);
  sheet.setColumnWidth(3, 350);
}

function getConfidenceThreshold() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_SETTINGS);
  if (!sheet) return 0.6;
  const val = parseFloat(sheet.getRange('B4').getValue());
  return isNaN(val) ? 0.6 : Math.max(0, Math.min(1, val));
}

function getUserCategories() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_CATEGORIES);
  if (!sheet) return CATEGORIES;
  const data = sheet.getRange('A3:A' + sheet.getLastRow()).getValues();
  const userCats = data.map(function(r) { return String(r[0]).trim(); }).filter(Boolean);
  return userCats.length > 0 ? userCats : CATEGORIES;
}
