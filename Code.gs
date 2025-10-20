function doPost(e) {
  const sheetId = "1vTRKT2u5FwkuYwAySq5iImj4P4jlo0GsXcdZzvsML-JOlluH3hbEj70TbTT3QyXKcRRXMxoCs2Kagg7"; // Replace with your actual Google Sheet ID
  const sheetName = "AttendanceData"; // Name of the sheet tab where data will be written

  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheetByName(sheetName);

  // Create the sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  const data = JSON.parse(e.postData.contents);

  // Define headers for your sheet
  const headers = ["Date", "Period", "Semester Name", "Faculty Name", "Roll Number", "Student Name", "Status"];

  // If the sheet is empty, add headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  // Append each student's attendance as a new row
  data.studentsAttendance.forEach(student => {
    sheet.appendRow([
      data.date,
      data.period,
      data.semesterName,
      data.facultyName,
      student.roll_number,
      student.name,
      student.is_present ? "Present" : "Absent"
    ]);
  });

  return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data exported to Google Sheet." }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  // This function is for testing GET requests, not used by the app.
  return ContentService.createTextOutput("Please use POST requests to submit attendance data.");
}