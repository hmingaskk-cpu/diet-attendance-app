function doPost(e) {
  var sheetId = '1vTRKT2u5FwkuYwAySq5iImj4P4jlo0GsXcdZzvsML-JOlluH3hbEj70TbTT3QyXKcRRXMxoCs2Kagg7'; // REPLACE WITH YOUR ACTUAL SPREADSHEET ID
  var sheetName = 'AttendanceData'; // REPLACE WITH THE NAME OF THE SHEET TAB YOU WANT TO WRITE TO
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Sheet not found: ' + sheetName }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = JSON.parse(e.postData.contents);

  // Assuming data is an array of attendance records
  // Each record should have properties like date, period, studentName, rollNumber, isPresent, semesterName
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var record = data[i];
    rows.push([
      record.date,
      record.period,
      record.studentName,
      record.rollNumber,
      record.isPresent ? 'Present' : 'Absent',
      record.semesterName,
      new Date().toLocaleString() // Timestamp of export
    ]);
  }

  // Add headers if the sheet is empty
  if (sheet.getLastRow() == 0) {
    sheet.appendRow(['Date', 'Period', 'Student Name', 'Roll Number', 'Status', 'Semester Name', 'Export Timestamp']);
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

  return ContentService.createTextOutput(JSON.stringify({ success: true, rowsAppended: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}