/**
 * Scan each student’s notes sheet for 当日キャンセル,
 * and list those student IDs in the Master sheet "当日キャンセル".
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — replace with your actual Spreadsheet IDs & sheet names
// ─────────────────────────────────────────────────────────────────────────────
var MASTER_SPREADSHEET_ID    = '1upKC-iNWs7HIeKiVVAegve5O5WbNebbjMlveMcvnuow';   // where "Students" and "当日キャンセル" live
var NOTES_SPREADSHEET_ID     = '1SSSg0rwyhJUokrgN8zVTxSa0IxBUYZ_MBX-ls4VGefg';    // where each student’s sheet (named by ID) lives
var STUDENTS_SHEET_NAME      = 'Students';                        // exact name of your master list
var CANCELLATION_SHEET_NAME  = '当日キャンセル';                  // exact name of the sheet to write IDs into

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS — change only if your columns differ
// ─────────────────────────────────────────────────────────────────────────────
var STUDENT_ID_COLUMN        = 1;  // column A in your Students sheet
var NOTE_COLUMN_IN_NOTES     = 2;  // column B in each student’s notes sheet
var CANCELLATION_TEXT        = '当日キャンセル';  // exact text to look for in notes



/**
 * Main entrypoint.
 * 1) Reads every student ID from Students!A
 * 2) Opens the corresponding sheet in the notes file (tries “1” then “001”)
 * 3) Scans column B for 当日キャンセル
 * 4) Collects all matching IDs, dedupes them
 * 5) Clears the "当日キャンセル" sheet and writes one ID per row in column A
 */
function markSameDayCancellations() {
  var masterSS    = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  var studentsSh  = masterSS.getSheetByName(STUDENTS_SHEET_NAME);
  var cancelSh    = masterSS.getSheetByName(CANCELLATION_SHEET_NAME);
  if (!studentsSh || !cancelSh) {
    throw new Error('Check that both "'+STUDENTS_SHEET_NAME+'" and "'+CANCELLATION_SHEET_NAME+'" exist.');
  }
  
  // read all student IDs
  var rows        = studentsSh.getDataRange().getValues();
  var notesSS     = SpreadsheetApp.openById(NOTES_SPREADSHEET_ID);
  var cancelled   = [];
  
  for (var r = 1; r < rows.length; r++) {
    var id = rows[r][STUDENT_ID_COLUMN - 1];
    if (!id) continue;
    if (_hasCancellation(notesSS, id.toString())) {
      cancelled.push(id.toString());
    }
  }
  
  // dedupe & write
  cancelled = Array.from(new Set(cancelled));
  cancelSh.clearContents();
  if (cancelled.length) {
    var out = cancelled.map(function(id){ return [id]; });
    cancelSh.getRange(1,1,out.length,1).setValues(out);
    Logger.log('Wrote '+out.length+' IDs.');
  } else {
    Logger.log('No cancellations found; sheet cleared.');
  }
}


/**
 * Checks a given studentId sheet for 当日キャンセル.
 * Tries raw ID, then zero-padded 3-digit form.
 */
function _hasCancellation(notesSS, studentId) {
  var namesToTry = [ studentId ];
  var n = parseInt(studentId,10);
  if (!isNaN(n)) {
    namesToTry.push( Utilities.formatString('%03d', n) );
  }
  
  for (var i = 0; i < namesToTry.length; i++) {
    var sh = notesSS.getSheetByName(namesToTry[i]);
    if (!sh) continue;
    var data = sh.getDataRange().getValues();
    for (var row = 1; row < data.length; row++) {
      var cell = data[row][NOTE_COLUMN_IN_NOTES - 1];
      if (cell && cell.toString().indexOf(CANCELLATION_TEXT) !== -1) {
        return true;
      }
    }
  }
  return false;
}
