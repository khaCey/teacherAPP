function migratePayments2025ToPayment() {
  var sourceSheetId = '1cWeTiRUpeRtOtKRJxkcUjy2Gcy2xbYSly8S2YFSUMoM';
  var targetSheetId = '1upKC-iNWs7HIeKiVVAegve5O5WbNebbjMlveMcvnuow';
  var sourceTab = '2025';
  var targetTab = 'Payment';
  var studentsTab = 'Students';

  // Open source and target spreadsheets
  var sourceSS = SpreadsheetApp.openById(sourceSheetId);
  var targetSS = SpreadsheetApp.openById(targetSheetId);
  var sourceSheet = sourceSS.getSheetByName(sourceTab);
  var targetSheet = targetSS.getSheetByName(targetTab);
  var studentsSheet = targetSS.getSheetByName(studentsTab);

  // Get all data
  var sourceData = sourceSheet.getDataRange().getValues();
  var targetHeaders = targetSheet.getDataRange().getValues()[0];
  var studentsData = studentsSheet.getDataRange().getValues();
  var studentsHeaders = studentsData[0];
  var nameIdx = studentsHeaders.indexOf('Name');
  var idIdx = studentsHeaders.indexOf('ID');

  // Helper: Lookup Student ID by Name
  function lookupStudentIdByName(name) {
    for (var i = 1; i < studentsData.length; i++) {
      if (String(studentsData[i][nameIdx]).trim() === String(name).trim()) {
        return studentsData[i][idIdx];
      }
    }
    return '';
  }

  // Helper: Generate Transaction ID
  function generateTransactionId() {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = 'TXN-';
    for (var i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Helper: Correct month typos and return full month name
  function correctMonth(monthStr) {
    if (!monthStr) return '';
    var months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    var abbr = monthStr.trim().substring(0, 3).toLowerCase();
    for (var i = 0; i < months.length; i++) {
      if (months[i].substring(0, 3).toLowerCase() === abbr) {
        return months[i];
      }
    }
    return monthStr; // fallback to original if not matched
  }

  // Helper: Format date as YYYY-MM-DD
  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d)) return '';
    var yyyy = d.getFullYear();
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return yyyy + '-' + mm + '-' + dd;
  }

  // Map source headers (A=0, B=1, ...)
  var nameCol = 0; // Name
  var monthCol = 1; // Month
  var lessonsCol = 4; // # of lessons
  var offerCol = 5; // Offer
  var totalCol = 7; // Total (H)
  var paidOnCol = 8; // Paid on
  var staffCol = 9; // Staff
  var noteCol = 10; // Note

  // Start from i = 1 to skip the header row
  for (var i = 1; i < sourceData.length; i++) {
    var row = sourceData[i];
    var name = row[nameCol];
    var month = correctMonth(row[monthCol]);
    var lessons = row[lessonsCol];
    var offer = row[offerCol];
    var total = row[totalCol];
    // Convert total to integer (remove currency symbols and commas, ignore decimals)
    if (typeof total === 'string') {
      total = total.replace(/[^\d.\-]/g, '');
      total = total ? Math.trunc(Number(total)) : '';
    } else {
      total = Math.trunc(total);
    }
    var paidOn = formatDate(row[paidOnCol]);
    var staff = row[staffCol];
    var note = row[noteCol];

    var studentId = lookupStudentIdByName(name);
    var year = '2025';
    var transactionId = generateTransactionId();
    var discount = offer;
    var amount = lessons;
    var method = note;

    // Build new row in target order
    var newRow = [];
    newRow[targetHeaders.indexOf('Transaction ID')] = transactionId;
    newRow[targetHeaders.indexOf('Student ID')] = studentId;
    newRow[targetHeaders.indexOf('Year')] = year;
    newRow[targetHeaders.indexOf('Month')] = month;
    newRow[targetHeaders.indexOf('Amount')] = amount;
    newRow[targetHeaders.indexOf('Discount')] = discount;
    newRow[targetHeaders.indexOf('Total')] = total;
    newRow[targetHeaders.indexOf('Date')] = paidOn;
    newRow[targetHeaders.indexOf('Method')] = method;
    newRow[targetHeaders.indexOf('Staff')] = staff;

    targetSheet.appendRow(newRow);
  }
}

function testTotalRetrieval() {
  var sourceSheetId = '1cWeTiRUpeRtOtKRJxkcUjy2Gcy2xbYSly8S2YFSUMoM';
  var sourceTab = '2025';
  var sourceSS = SpreadsheetApp.openById(sourceSheetId);
  var sourceSheet = sourceSS.getSheetByName(sourceTab);
  var sourceData = sourceSheet.getDataRange().getValues();

  // Map source headers (A=0, B=1, ...)
  var totalCol = 7; // Total (H)

  for (var i = 1; i < Math.min(11, sourceData.length); i++) { // skip header, max 10 records
    var row = sourceData[i];
    var totalRaw = row[totalCol];
    var asString = String(totalRaw);
    var asNumber = Math.trunc(Number(totalRaw));
    console.log('Row ' + i + ': asString = "' + asString + '", asInteger =', asNumber);
  }
}
