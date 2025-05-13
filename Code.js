var SS_ID          = '1upKC-iNWs7HIeKiVVAegve5O5WbNebbjMlveMcvnuow';
var STUDENT_SHEET  = 'Students';
var PAYMENT_SHEET  = 'Payment';
var NOTES_SHEET    = 'Notes';
var LESSON_SHEET   = 'Lessons';

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('GreenSquare Student Admin');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ─── STUDENTS ─────────────────────────────────────────────────────────────────

function getStudents() {
  var sh = SpreadsheetApp.openById(SS_ID).getSheetByName(STUDENT_SHEET);
  return sh.getDataRange().getDisplayValues();
}

function getStudentById(id) {
  var data = getStudents(), headers = data[0], idx = headers.indexOf('ID');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idx]) === String(id)) {
      var obj = {};
      headers.forEach(function(h,j){ obj[h] = data[i][j]; });
      return obj;
    }
  }
  return null;
}

function addStudent(student) {
  var sh      = SpreadsheetApp.openById(SS_ID).getSheetByName(STUDENT_SHEET),
      headers = sh.getDataRange().getValues()[0],
      ids     = sh.getRange(2,1,sh.getLastRow()-1,1).getValues().flat(),
      nextId  = ids.length ? Math.max.apply(null, ids)+1 : 1,
      row     = headers.map(function(h){
        return h==='ID' ? nextId : (student[h]||'');
      });
  sh.appendRow(row);
  return nextId;
}

function updateStudent(student) {
  var sh      = SpreadsheetApp.openById(SS_ID).getSheetByName(STUDENT_SHEET),
      values  = sh.getDataRange().getValues(),
      headers = values[0],
      idx     = headers.indexOf('ID');
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idx]) === String(student.ID)) {
      headers.forEach(function(h,j){
        if (h!=='ID') sh.getRange(i+1,j+1).setValue(student[h]||'');
      });
      return true;
    }
  }
  return false;
}

function deleteStudent(id) {
  var sh      = SpreadsheetApp.openById(SS_ID).getSheetByName(STUDENT_SHEET),
      values  = sh.getDataRange().getValues(),
      idx     = values[0].indexOf('ID');
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idx]) === String(id)) {
      sh.deleteRow(i+1);
      return true;
    }
  }
  return false;
}

// ─── DETAILS ──────────────────────────────────────────────────────────────────

function getStudentDetails(id) {
  var ss     = SpreadsheetApp.openById(SS_ID),
      result = { student: getStudentById(id), payments: [], notes: [] };

  // Payments
  var psh      = ss.getSheetByName(PAYMENT_SHEET),
      pdata    = psh.getDataRange().getDisplayValues(),
      pheaders = pdata.shift(),
      pidIdx   = pheaders.indexOf('Student ID');
  pdata.forEach(function(r){
    if (String(r[pidIdx]) === String(id)) {
      var obj = {};
      pheaders.forEach(function(h,j){ obj[h] = r[j]; });
      result.payments.push(obj);
    }
  });

  // Notes
  var nsh      = ss.getSheetByName(NOTES_SHEET),
      ndata    = nsh.getDataRange().getDisplayValues(),
      nheaders = ndata.shift(),
      nidIdx   = nheaders.indexOf('Student ID');
  ndata.forEach(function(r){
    if (String(r[nidIdx]) === String(id)) {
      var obj = {};
      nheaders.forEach(function(h,j){ obj[h] = r[j]; });
      result.notes.push(obj);
    }
  });

  return result;
}

// ─── LATEST-BY-MONTH ──────────────────────────────────────────────────────────

function getLatestByMonth(id) {
  var ss      = SpreadsheetApp.openById(SS_ID),
      sh      = ss.getSheetByName(LESSON_SHEET),
      values  = sh.getDataRange().getDisplayValues(),
      headers = values.shift(),
      idx     = {
        id:    headers.indexOf('Student ID'),
        month: headers.indexOf('Month'),
        pay:   headers.indexOf('Payment'),
        sch:   headers.indexOf('Schedule'),
        bkd:   headers.indexOf('Booked'),
        schd:  headers.indexOf('Scheduled')
      },
      tz       = Session.getScriptTimeZone(),
      today    = new Date(),
      thisStr  = Utilities.formatDate(today, tz, 'MMMM yyyy'),
      nextDate = new Date(today.getFullYear(), today.getMonth()+1, 1),
      nextStr  = Utilities.formatDate(nextDate, tz, 'MMMM yyyy'),
      thisRec  = null,
      nextRec  = null;

  for (var i = values.length - 1; i >= 0; i--) {
    var r = values[i];
    if (String(r[idx.id]) !== String(id)) continue;
    if (!thisRec && r[idx.month] === thisStr) {
      thisRec = {
        Payment:   r[idx.pay],
        Schedule:  r[idx.sch],
        Booked:    r[idx.bkd],
        Scheduled: r[idx.schd]
      };
    }
    if (!nextRec && r[idx.month] === nextStr) {
      nextRec = {
        Payment:   r[idx.pay],
        Schedule:  r[idx.sch],
        Booked:    r[idx.bkd],
        Scheduled: r[idx.schd]
      };
    }
    if (thisRec && nextRec) break;
  }
  return { thisRec: thisRec, nextRec: nextRec };
}

// ─── EDIT NOTES ───────────────────────────────────────────────────────────────

function updateNote(note) {
  var ss      = SpreadsheetApp.openById(SS_ID),
      sh      = ss.getSheetByName(NOTES_SHEET),
      vals    = sh.getDataRange().getValues(),
      headers = vals[0],
      idx     = headers.indexOf('Notes ID');
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][idx]) === String(note['Notes ID'])) {
      headers.forEach(function(h,j){
        if (h !== 'Notes ID') {
          sh.getRange(i+1,j+1).setValue(note[h]||'');
        }
      });
      return true;
    }
  }
  return false;
}

// ─── EDIT PAYMENTS ────────────────────────────────────────────────────────────

function updatePayment(pay) {
  var ss      = SpreadsheetApp.openById(SS_ID),
      sh      = ss.getSheetByName(PAYMENT_SHEET),
      data    = sh.getDataRange().getValues(),
      headers = data[0],
      idx     = headers.indexOf('Transaction ID');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idx]) === String(pay['Transaction ID'])) {
      headers.forEach(function(h,j){
        if (h !== 'Transaction ID') {
          sh.getRange(i+1,j+1).setValue(pay[h]||'');
        }
      });
      return true;
    }
  }
  return false;
}

/**
 * Create or update a row in the Lessons sheet.
 * Matches by Student ID + Month (record.Month = "YYYY-MM"),
 * then writes Month as "MMMM yyyy" and auto-marks Payment/Scheduled.
 *
 * @param {{
 *   'Student ID': string|number,
 *   Month:       string,    // "YYYY-MM" from <input type="month">
 *   Lessons:     string,    // booked count
 *   ScheduledCount: string, // planned count
 *   Payment:     string,    // will be '済'
 *   Schedule:    string,    // copy-through or '未'
 *   Method:      string,
 *   Staff:       string,
 *   Total:       string
 * }} record
 */
function saveMonthlyRecord(record) {
  var ss      = SpreadsheetApp.openById(SS_ID);
  var sh      = ss.getSheetByName(LESSON_SHEET);
  var allData = sh.getDataRange().getValues();     // real Date objects for date‐formatted cells
  var headers = allData.shift();                   // first row = headers
  var rows    = allData;                           // the rest

  // 0) Compute recDate from YYYY-MM
  var parts    = record.Month.split('-');
  var year     = parseInt(parts[0], 10);
  var monthNum = parseInt(parts[1], 10) - 1;
  var recDate  = new Date(year, monthNum, 1);
  var tz       = ss.getSpreadsheetTimeZone();
  var monthText = Utilities.formatDate(recDate, tz, 'MMMM yyyy');

  // 1) Find column indices
  var sidIdx   = headers.indexOf('Student ID');
  var monIdx   = headers.indexOf('Month');
  var payIdx   = headers.indexOf('Payment');
  var schIdx   = headers.indexOf('Schedule');
  var bkdIdx   = headers.indexOf('Booked');
  var scdCntIdx= headers.indexOf('ScheduledCount');
  var scdIdx   = headers.indexOf('Scheduled');

  // 2) Auto-mark Payment='済' and Scheduled if lessons==planned
  record.Payment   = '済';
  var bkd = Number(record.Lessons) || 0;
  var scdCnt = Number(record.ScheduledCount) || 0;
  record.Scheduled = (bkd >= scdCnt && scdCnt>0) ? '済' : record.Scheduled || '未';

  // 3) Locate existing row
  var foundRow = -1;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][sidIdx]) !== String(record['Student ID'])) continue;
    var cell = rows[i][monIdx];
    var match = false;
    if (cell instanceof Date) {
      match = cell.getFullYear()===year && cell.getMonth()===monthNum;
    } else {
      match = String(cell).trim() === monthText;
    }
    if (match) {
      foundRow = i + 2;  // account for header + 1-based
      break;
    }
  }

  if (foundRow !== -1) {
    // 4a) Update existing
    headers.forEach(function(h, j) {
      if (h==='Student ID') return;
      var val;
      switch (h) {
        case 'Month':           val = monthText; break;
        case 'Payment':         val = record.Payment; break;
        case 'Schedule':        val = record.Schedule; break;
        case 'Booked':          val = record.Lessons; break;
        case 'ScheduledCount':  val = record.ScheduledCount; break;
        case 'Scheduled':       val = record.Scheduled; break;
        case 'Total':           val = record.Total; break;
        case 'Method':          val = record.Method; break;
        case 'Staff':           val = record.Staff; break;
        default:                val = record[h] || '';
      }
      sh.getRange(foundRow, j+1).setValue(val);
    });
  } else {
    // 4b) Append new row
    var newRow = headers.map(function(h) {
      switch (h) {
        case 'Student ID':      return record['Student ID'];
        case 'Month':           return monthText;
        case 'Payment':         return record.Payment;
        case 'Schedule':        return record.Schedule;
        case 'Booked':          return record.Lessons;
        case 'ScheduledCount':  return record.ScheduledCount;
        case 'Scheduled':       return record.Scheduled;
        case 'Total':           return record.Total;
        case 'Method':          return record.Method;
        case 'Staff':           return record.Staff;
        default:                return '';
      }
    });
    sh.appendRow(newRow);
  }
}


function getCurrentStaffName() {
  var ss = SpreadsheetApp.openById(SS_ID);
  return ss.getSheetByName('Code').getRange('B1').getValue();
}

function addNote(note) {
  Logger.log('📝 Adding note: ' + JSON.stringify(note));

  var ss      = SpreadsheetApp.openById(SS_ID);
  var sh      = ss.getSheetByName(NOTES_SHEET);
  var headers = sh.getDataRange().getValues()[0];

  var newRow = headers.map(function(h) {
    return note[h] || '';
  });

  Logger.log('🧾 Final Row: ' + JSON.stringify(newRow));

  sh.appendRow(newRow);
  return true;
}

// ────────────────────────────────────────────────────────────────────────────────
// FeeUtils.gs  (or paste into the bottom of your existing Code.gs)
// ────────────────────────────────────────────────────────────────────────────────

// 1) The per-lesson tables for Proto & Neo
const feeTable = {
  "Proto": {
    "Single": [[2, 4620], [4, 4400], [8, 3960]],
    "Group": {
      2: [[2, 2860], [4, 2750], [8, 2530]],
      3: [[2, 2273], [4, 2200], [8, 2053]],
      4: [[2, 1980], [4, 1925], [8, 1815]]
    }
  },
  "Neo": {
    "Single": [[2, 7150], [4, 5720], [8, 4950]],
    "Group": {
      2: [[2, 4675], [4, 3960], [8, 3575]],
      3: [[2, 3850], [4, 3373], [8, 3117]],
      4: [[2, 3438], [4, 3080], [8, 2888]]
    }
  }
};

// 2) Helpers to clean up string inputs
function normalizeString(v) {
  return v ? v.toString().trim().toLowerCase() : null;
}
function capitalize(v) {
  if (!v) return null;
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

// 3) Core: pick the right per-lesson rate by threshold
function getRate(rates, lessons) {
  for (let [threshold, price] of rates) {
    if (lessons <= threshold) {
      return lessons * price;
    }
  }
  // if beyond all thresholds, use the highest bracket
  const highest = rates[rates.length - 1][1];
  return lessons * highest;
}

// 4) calculateFee(): handles Pronunciation flat rate, Single vs Group tables
function calculateFee(lessonType, feeType, groupSize, lessons) {
  // Flat Pronunciation
  if (feeType === "Pronunciation") {
    const unit = 7700;
    return lessons * unit;
  }

  // Private (Single) lessons
  if (lessonType === "Single") {
    const rates = feeTable[feeType].Single;
    return getRate(rates, lessons);
  }

  // Group lessons
  const groupRates = feeTable[feeType].Group[groupSize];
  if (!groupRates) {
    throw new Error("Invalid group size: " + groupSize);
  }
  return getRate(groupRates, lessons);
}

/**
 * Calculates total fee for a given student + lesson count,
 * by looking up that student’s Type, Group and 人数 on STUDENT_SHEET.
 *
 * @param {string|number} studentID
 * @param {number} lessons
 * @return {number}
 *//**
 * Calculates total fee for a given student + lesson count,
 * by looking up that student’s Type, Group and 人数 on STUDENT_SHEET.
 */
function getTotalFeeForStudent(studentID, lessons) {
  Logger.log('🔍 getTotalFeeForStudent: studentID=%s, lessons=%s', studentID, lessons);

  const ss    = SpreadsheetApp.openById(SS_ID);
  const sh    = ss.getSheetByName(STUDENT_SHEET);
  const values  = sh.getDataRange().getDisplayValues();
  const heads = values.shift();

  // Find column indices
  const idCol    = heads.indexOf('ID');
  const typeCol  = heads.indexOf('Type');
  const groupCol = heads.indexOf('Group');
  const sizeCol  = heads.indexOf('人数');
  Logger.log('IndexOf -> ID:%d, Type:%d, Group:%d, 人数:%d', idCol, typeCol, groupCol, sizeCol);

  // Locate the student row
  let rawFeeType, rawLessonType, groupSize;
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][idCol]) === String(studentID)) {
      rawFeeType      = values[i][typeCol];
      rawLessonType   = values[i][groupCol];
      groupSize       = Number(values[i][sizeCol]) || 0;
      Logger.log('Found row %d → Type:%s, Group:%s, 人数:%d', i+2, rawFeeType, rawLessonType, groupSize);
      break;
    }
  }
  if (!rawFeeType) {
    throw new Error('Student ID ' + studentID + ' not found in Students sheet.');
  }

  // Normalize to match feeTable keys:
  //   PROTO  → Proto
  //   NEO    → Neo
  let feeTypeKey = capitalize(rawFeeType.toLowerCase());
  // Map "Individual" → "Single" since your table uses 'Single'
  let lessonTypeKey = (rawLessonType.trim().toLowerCase() === 'individual')
                      ? 'Single'
                      : capitalize(rawLessonType.toLowerCase());

  Logger.log('Normalized → feeTypeKey:%s, lessonTypeKey:%s, groupSize:%d',
             feeTypeKey, lessonTypeKey, groupSize);

  // Delegate into calculateFee
  const total = calculateFee(lessonTypeKey, feeTypeKey, groupSize, lessons);
  Logger.log('→ Calculated total: %s', total);
  return total;
}

/** Helper: uppercase first letter, lowercase rest */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}


/**
 * Returns everything needed to prefill the “Add Payment” form.
 * Called as google.script.run.getNewPaymentDefaults(studentID).
 */
function getNewPaymentDefaults(studentID) {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const yearStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy');
  
  // 1) pick first available month
  const months = getAvailableMonths(studentID, yearStr);
  const month   = months.length ? months[0] : Utilities.formatDate(new Date(today.getFullYear(), today.getMonth()+1,1), Session.getScriptTimeZone(), 'MMMM');

  // 2) default lessons count = your standard (e.g. 4)
  const defaultLessons = 4;
  
  // 3) calculate total fee
  const total = getTotalFeeFromStudentData(defaultLessons);

  // 4) default method
  const method = 'Cash';

  // 5) default staff from Code!B1 (or named range “Staff”)
  const staffSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Code');
  const staffName  = staffSheet.getRange('B1').getValue();

  return {
    transactionID: '',
    Date:          dateStr,
    Year:          yearStr,
    Month:         month,
    Amount:        defaultLessons,
    Total:         total,
    Method:        method,
    Staff:         staffName
  };
}
/**
 * Adds a new payment record (similar to addNote).
 * Expects `pay` to be an object whose keys match your Payment sheet headers.
 */
function insertPayment(pay) {
  Logger.log('💰 insertPayment called with: %s', JSON.stringify(pay));

  var ss      = SpreadsheetApp.openById(SS_ID);
  var sh      = ss.getSheetByName(PAYMENT_SHEET);
  if (!sh) throw new Error('Sheet "' + PAYMENT_SHEET + '" not found.');

  // Pull headers
  var headers = sh.getDataRange().getValues()[0];
  // Build a new row in header order
  var newRow = headers.map(function(h) {
    return pay[h] || '';
  });

  Logger.log('💾 Appending payment row: %s', JSON.stringify(newRow));
  sh.appendRow(newRow);
  return true;
}

