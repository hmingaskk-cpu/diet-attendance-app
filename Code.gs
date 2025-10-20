function doPost(e) {
  var response = {};
  var output = ContentService.createTextOutput();

  try {
    if (e && e.postData && e.postData.contents) {
      var requestBody = JSON.parse(e.postData.contents);
      Logger.log("Received request body: " + JSON.stringify(requestBody));

      var date = requestBody.date;
      var period = requestBody.period;
      var semesterName = requestBody.semesterName;
      var facultyName = requestBody.facultyName;
      var studentsAttendance = requestBody.studentsAttendance;

      // Get the active spreadsheet and the target sheet
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var sheetName = semesterName + " Attendance"; // Example: "1st Semester Attendance"
      var sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) {
        // If sheet doesn't exist, create it and add headers
        sheet = spreadsheet.insertSheet(sheetName);
        var headers = ["Date", "Period", "Faculty", "Student Name", "Roll Number", "Status"];
        sheet.appendRow(headers);
        Logger.log("Created new sheet: " + sheetName);
      }

      // Append attendance records
      var rows = [];
      studentsAttendance.forEach(function(student) {
        rows.push([
          date,
          period,
          facultyName,
          student.name,
          student.roll_number,
          student.is_present ? "Present" : "Absent"
        ]);
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      
      response = { status: "success", message: "Attendance data recorded successfully." };
      Logger.log("Attendance data recorded successfully.");

    } else {
      response = { status: "error", message: "No POST data received." };
      Logger.log("Error: No POST data received.");
    }
  } catch (error) {
    response = { status: "error", message: "Error processing request: " + error.message };
    Logger.log("Error in doPost: " + error.message);
  }

  output.setContent(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  return output;
}