/**
 * Batch-migrate student sheets into one consolidated Notes sheet.
 * Keeps notes only from the current year; if none, retains the latest 5 notes.
 * Forward-fills merged Date and Staff cells, formats dates as dd/MM/yyyy.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — replace with your actual IDs & sheet name
// ─────────────────────────────────────────────────────────────────────────────
var TARGET_SPREADSHEET_ID = '1upKC-iNWs7HIeKiVVAegve5O5WbNebbjMlveMcvnuow';
var SOURCE_SPREADSHEET_ID = '1RZI9fDEsauf3W9FBm72284xwT-DMj5dLGci_gHr4kOo';
var NOTES_SHEET_NAME = 'Notes';

function migrateOneSheetBatch() {
  var props = PropertiesService.getScriptProperties();
  var sheetList = JSON.parse(props.getProperty('MIGRATION_SHEETS') || '[]');
  var currentIdx = Number(props.getProperty('MIGRATION_INDEX') || '0');

  Logger.log('Starting migration batch at index: ' + currentIdx);

  if (!sheetList.length) {
    var srcSS = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
    sheetList = srcSS.getSheets().map(s => s.getName()).filter(isStudentSheetName);
    props.setProperty('MIGRATION_SHEETS', JSON.stringify(sheetList));
    props.setProperty('MIGRATION_INDEX', '0');
    currentIdx = 0;
    Logger.log('Discovered sheets: ' + sheetList.join(', '));
  }

  if (currentIdx >= sheetList.length) {
    props.deleteAllProperties();
    Logger.log('Migration complete; cleared properties.');
    return;
  }

  var srcSS = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  var tz = srcSS.getSpreadsheetTimeZone();
  var tgtSS = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  var notesSheet = tgtSS.getSheetByName(NOTES_SHEET_NAME);
  if (!notesSheet) throw new Error('Target sheet "' + NOTES_SHEET_NAME + '" not found!');

  var currentYear = new Date().getFullYear();

  for (var count = 0; count < 20 && currentIdx < sheetList.length; count++, currentIdx++) {
    var sheetName = sheetList[currentIdx];
    Logger.log('Processing sheet: ' + sheetName);
    var sh = srcSS.getSheetByName(sheetName);
    if (!sh) {
      Logger.log('Sheet not found: ' + sheetName);
      continue;
    }

    var data = sh.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log('Sheet has insufficient data: ' + sheetName);
      continue;
    }

    var batch = [], lastDate = null, lastStaff = null;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rawDate = row[0];
      var noteTxt = row[1];
      var rawStaff = row[2];

      if (rawDate instanceof Date) lastDate = rawDate;
      else if (typeof rawDate === 'string' && rawDate.trim() && rawDate.trim() !== '同日') lastDate = new Date(rawDate);

      if (rawStaff && String(rawStaff).trim()) lastStaff = rawStaff;

      if (!noteTxt || !lastDate) continue;

      batch.push({
        studentSheet: sheetName,
        notesId: sheetName + '-' + (i + 1),
        staff: lastStaff,
        date: lastDate,
        note: noteTxt
      });
    }

    Logger.log('Total notes found: ' + batch.length);

    var filteredBatch = batch.filter(n => n.date.getFullYear() === currentYear);

    if (filteredBatch.length === 0) {
      batch.sort((a, b) => b.date - a.date);
      filteredBatch = batch.slice(0, 5);
      Logger.log('No current-year notes; keeping latest 5 notes.');
    } else {
      Logger.log('Keeping notes from current year: ' + filteredBatch.length);
    }

    var formattedBatch = filteredBatch.map(n => [
      n.studentSheet,
      n.notesId,
      n.staff,
      Utilities.formatDate(n.date, tz, 'dd/MM/yyyy'),
      n.note
    ]);

    if (formattedBatch.length) {
      notesSheet.getRange(notesSheet.getLastRow() + 1, 1, formattedBatch.length, formattedBatch[0].length).setValues(formattedBatch);
      Logger.log('Appended rows to notes sheet: ' + formattedBatch.length);
    } else {
      Logger.log('No notes appended for sheet: ' + sheetName);
    }
  }

  props.setProperty('MIGRATION_INDEX', currentIdx.toString());
  Logger.log('Set next migration index: ' + currentIdx);

  if (currentIdx >= sheetList.length) {
    props.deleteAllProperties();
    Logger.log('Migration finished; cleared properties.');
  }
}

function isStudentSheetName(name) {
  return /^\d+$/.test(name);
}

function resetMigrationCounter() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log('Reset migration properties.');
}
