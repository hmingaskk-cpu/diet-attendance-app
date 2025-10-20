function doPost(e) {
  var response = {};
  var output = ContentService.createTextOutput();

  try {
    if (e && e.postData && e.postData.contents) {
      var requestBody = JSON.parse(e.postData.contents);
      Logger.log("Received request body: " + JSON.stringify(requestBody));

      // date and facultyName are no longer stored in the Google Sheet, but still passed from client
      var period = requestBody.period; // This is the specific period being submitted (e.g., 1, 2, 3)
      var semesterName = requestBody.semesterName;
      var studentsAttendance = requestBody.studentsAttendance; // Array of { name, roll_number, is_present }

      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var sheetName = semesterName + " Attendance"; // Sheet name defines the semester
      var sheet = spreadsheet.getSheetByName(sheetName);

      // New simplified headers
      var headers = ["Student Name", "Roll Number", "Period 1", "Period 2", "Period 3", "Period 4", "Period 5", "Period 6"];
      
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        sheet.appendRow(headers);
        Logger.log("Created new sheet: " + sheetName + " with headers: " + JSON.stringify(headers));
      } else {
        // Clear all content except the header row to ensure a "clean sheet" for the day
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) { // If there's data beyond the header
          sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
          Logger.log("Cleared existing data in sheet: " + sheetName);
        }

        var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var trimmedExistingHeaders = existingHeaders.map(h => String(h).trim());
        var trimmedExpectedHeaders = headers.map(h => String(h).trim());

        if (JSON.stringify(trimmedExistingHeaders) !== JSON.stringify(trimmedExpectedHeaders)) {
          Logger.log("WARNING: Existing headers in sheet '" + sheetName + "' do not match expected headers. Expected: " + JSON.stringify(headers) + ", Found: " + JSON.stringify(existingHeaders));
          // If headers don't match, we might need to adjust the sheet or throw an error.
          // For now, we'll proceed, but this is a potential source of issues if columns are misaligned.
        }
      }

      // Re-fetch values after clearing, or if sheet was just created
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues(); // Get all data from the sheet (now only headers or empty)
      var headerRow = values[0]; // Assuming first row is header

      // Find column indices dynamically based on new headers
      var studentNameCol = headerRow.indexOf("Student Name");
      var rollNumberCol = headerRow.indexOf("Roll Number");
      var targetPeriodCol = headerRow.indexOf("Period " + period);

      // Basic validation for column existence
      if (studentNameCol === -1 || rollNumberCol === -1 || targetPeriodCol === -1) {
        throw new Error("One or more required columns not found in sheet: " + sheetName + ". Please ensure headers are correct: " + JSON.stringify(headers));
      }

      var updatedRowsCount = 0;
      var newRowsCount = 0;

      studentsAttendance.forEach(function(student) {
        var studentFound = false;
        var studentNameTrimmed = student.name.trim();
        var rollNumberTrimmed = student.roll_number.trim();

        Logger.log("--- Processing student: " + studentNameTrimmed + " (Roll: " + rollNumberTrimmed + ") for Period: " + period + " ---");

        // Since we clear the sheet, we will always be adding new rows for the current submission.
        // The "update" logic is now effectively "create a new row for this student for this submission".
        // However, we still iterate to ensure no duplicates are accidentally created if the clear failed or if
        // multiple submissions happen very quickly without a full clear.
        for (var i = 1; i < values.length; i++) { // Start from 1 to skip header row
          var row = values[i];
          
          var sheetStudentName = String(row[studentNameCol]).trim();
          var sheetRollNumber = String(row[rollNumberCol]).trim();

          Logger.log("  Comparing with row " + (i + 1) + ":");
          Logger.log("    Request Student Name: '" + studentNameTrimmed + "' vs Sheet Student Name: '" + sheetStudentName + "' (Match: " + (studentNameTrimmed === sheetStudentName) + ")");
          Logger.log("    Request Roll Number: '" + rollNumberTrimmed + "' vs Sheet Roll Number: '" + sheetRollNumber + "' (Match: " + (rollNumberTrimmed === sheetRollNumber) + ")");

          if (sheetStudentName === studentNameTrimmed && sheetRollNumber === rollNumberTrimmed) {
            // Found existing row (should only happen if clear failed or very fast resubmission)
            row[targetPeriodCol] = student.is_present ? "Present" : "Absent";
            sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
            studentFound = true;
            updatedRowsCount++;
            Logger.log("  -> Existing row " + (i + 1) + " updated for " + student.name + ".");
            break;
          }
        }

        if (!studentFound) {
          // Create a new row for this student
          var newRow = new Array(headers.length).fill(""); // Initialize with empty strings
          newRow[studentNameCol] = student.name;
          newRow[rollNumberCol] = student.roll_number;
          newRow[targetPeriodCol] = student.is_present ? "Present" : "Absent";
          sheet.appendRow(newRow);
          newRowsCount++;
          Logger.log("  -> New row added for " + student.name + ".");
        }
      });
      
      response = { status: "success", message: "Attendance data recorded successfully. Updated " + updatedRowsCount + " rows, added " + newRowsCount + " rows." };
      Logger.log(response.message);

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