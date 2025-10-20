function doPost(e) {
  var response = {};
  var output = ContentService.createTextOutput();

  try {
    if (e && e.postData && e.postData.contents) {
      var requestBody = JSON.parse(e.postData.contents);
      Logger.log("Received request body: " + JSON.stringify(requestBody));

      // date and facultyName are passed from client but no longer stored in the Google Sheet
      var period = requestBody.period; // This is the specific period being submitted (e.g., 1, 2, 3)
      var semesterName = requestBody.semesterName;
      var studentsAttendance = requestBody.studentsAttendance; // Array of { name, roll_number, is_present }

      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var sheetName = semesterName + " Attendance"; // Sheet name defines the semester
      var sheet = spreadsheet.getSheetByName(sheetName);

      // Simplified headers: Student Name, Roll Number, and Period columns
      var headers = ["Student Name", "Roll Number", "Period 1", "Period 2", "Period 3", "Period 4", "Period 5", "Period 6"];
      
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        sheet.appendRow(headers);
        Logger.log("Created new sheet: " + sheetName + " with headers: " + JSON.stringify(headers));
      } else {
        // Check if existing headers match, ignoring case and trimming for comparison
        var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var trimmedExistingHeaders = existingHeaders.map(h => String(h).trim());
        var trimmedExpectedHeaders = headers.map(h => String(h).trim());

        if (JSON.stringify(trimmedExistingHeaders) !== JSON.stringify(trimmedExpectedHeaders)) {
          Logger.log("WARNING: Existing headers in sheet '" + sheetName + "' do not match expected headers. Expected: " + JSON.stringify(headers) + ", Found: " + JSON.stringify(existingHeaders));
          // If headers don't match, this could lead to incorrect column updates.
          // For robust production, you might want to throw an error or attempt to fix headers.
        }
      }

      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues(); // Get all data from the sheet (including existing attendance)
      var headerRow = values[0]; // Assuming first row is header

      // Find column indices dynamically based on new headers
      var studentNameCol = headerRow.indexOf("Student Name");
      var rollNumberCol = headerRow.indexOf("Roll Number");
      var targetPeriodCol = headerRow.indexOf("Period " + period); // e.g., "Period 1" -> index 2

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

        for (var i = 1; i < values.length; i++) { // Start from 1 to skip header row
          var row = values[i];
          
          var sheetStudentName = String(row[studentNameCol]).trim();
          var sheetRollNumber = String(row[rollNumberCol]).trim();

          Logger.log("  Comparing with row " + (i + 1) + ":");
          Logger.log("    Request Student Name: '" + studentNameTrimmed + "' vs Sheet Student Name: '" + sheetStudentName + "' (Match: " + (studentNameTrimmed === sheetStudentName) + ")");
          Logger.log("    Request Roll Number: '" + rollNumberTrimmed + "' vs Sheet Roll Number: '" + sheetRollNumber + "' (Match: " + (rollNumberTrimmed === sheetRollNumber) + ")");

          if (sheetStudentName === studentNameTrimmed && sheetRollNumber === rollNumberTrimmed) {
            // Found existing row, update ONLY the target period column
            row[targetPeriodCol] = student.is_present ? "Present" : "Absent";
            sheet.getRange(i + 1, 1, 1, row.length).setValues([row]); // Update the specific row
            studentFound = true;
            updatedRowsCount++;
            Logger.log("  -> Existing row " + (i + 1) + " updated for " + student.name + " in Period " + period + ".");
            break;
          }
        }

        if (!studentFound) {
          // Create a new row for this student
          var newRow = new Array(headers.length).fill(""); // Initialize with empty strings
          newRow[studentNameCol] = student.name;
          newRow[rollNumberCol] = student.roll_number;
          newRow[targetPeriodCol] = student.is_present ? "Present" : "Absent"; // Only fill the current period
          sheet.appendRow(newRow);
          newRowsCount++;
          Logger.log("  -> New row added for " + student.name + " for Period " + period + ".");
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