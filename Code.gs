function doPost(e) {
  var response = {};
  var output = ContentService.createTextOutput();

  try {
    if (e && e.postData && e.postData.contents) {
      var requestBody = JSON.parse(e.postData.contents);
      Logger.log("Received request body: " + JSON.stringify(requestBody));

      var period = requestBody.period;
      var semesterName = requestBody.semesterName;
      var studentsAttendance = requestBody.studentsAttendance;

      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var sheetName = semesterName + " Attendance";
      var sheet = spreadsheet.getSheetByName(sheetName);
      var isNewSheet = false;

      var headers = ["Student Name", "Roll Number", "Period 1", "Period 2", "Period 3", "Period 4", "Period 5", "Period 6"];
      
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        sheet.appendRow(headers);
        isNewSheet = true;
        Logger.log("Created new sheet: " + sheetName + " with headers: " + JSON.stringify(headers));
      } else {
        var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var trimmedExistingHeaders = existingHeaders.map(h => String(h).trim());
        var trimmedExpectedHeaders = headers.map(h => String(h).trim());

        if (JSON.stringify(trimmedExistingHeaders) !== JSON.stringify(trimmedExpectedHeaders)) {
          Logger.log("WARNING: Existing headers in sheet '" + sheetName + "' do not match expected headers. Expected: " + JSON.stringify(headers) + ", Found: " + JSON.stringify(existingHeaders));
        }
      }

      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headerRow = values[0];

      var studentNameCol = headerRow.indexOf("Student Name");
      var rollNumberCol = headerRow.indexOf("Roll Number");
      var targetPeriodCol = headerRow.indexOf("Period " + period);

      if (studentNameCol === -1 || rollNumberCol === -1 || targetPeriodCol === -1) {
        throw new Error("One or more required columns not found in sheet: " + sheetName + ". Please ensure headers are correct: " + JSON.stringify(headers));
      }

      // Ensure Roll Number column is formatted as plain text
      if (rollNumberCol !== -1) {
        var rollNumberColumnRange = sheet.getRange(1, rollNumberCol + 1, sheet.getMaxRows(), 1); // Apply to entire column
        rollNumberColumnRange.setNumberFormat("@"); // "@" is for plain text
        Logger.log("Set 'Roll Number' column format to plain text in sheet: " + sheetName);
      }

      var updatedRowsCount = 0;
      var newRowsCount = 0;

      studentsAttendance.forEach(function(student) {
        var studentFound = false;
        var studentNameTrimmed = student.name.trim();
        var rollNumberTrimmed = student.roll_number.trim();

        Logger.log("--- Processing student: " + studentNameTrimmed + " (Roll: '" + rollNumberTrimmed + "') for Period: " + period + " ---");

        for (var i = 1; i < values.length; i++) {
          var row = values[i];
          
          var sheetStudentName = String(row[studentNameCol]).trim();
          var sheetRollNumber = String(row[rollNumberCol]).trim();

          Logger.log("  Comparing with row " + (i + 1) + ":");
          Logger.log("    Request Student Name: '" + studentNameTrimmed + "' vs Sheet Student Name: '" + sheetStudentName + "' (Match: " + (studentNameTrimmed === sheetStudentName) + ")");
          Logger.log("    Request Roll Number: '" + rollNumberTrimmed + "' (Type: " + typeof rollNumberTrimmed + ") vs Sheet Roll Number: '" + sheetRollNumber + "' (Type: " + typeof sheetRollNumber + ") (Match: " + (rollNumberTrimmed === sheetRollNumber) + ")");

          if (sheetStudentName === studentNameTrimmed && sheetRollNumber === rollNumberTrimmed) {
            row[targetPeriodCol] = student.is_present ? "Present" : "Absent";
            sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
            studentFound = true;
            updatedRowsCount++;
            Logger.log("  -> Existing row " + (i + 1) + " updated for " + student.name + " in Period " + period + ".");
            break;
          }
        }

        if (!studentFound) {
          var newRow = new Array(headers.length).fill("");
          newRow[studentNameCol] = student.name;
          newRow[rollNumberCol] = student.roll_number;
          newRow[targetPeriodCol] = student.is_present ? "Present" : "Absent";
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

/**
 * Clears attendance data (Period 1-6 columns) from all "Semester Attendance" sheets.
 * Leaves Student Name and Roll Number columns intact.
 * This function is intended to be run by a daily time-driven trigger.
 */
function clearDailyAttendancePeriods() {
  Logger.log("Starting clearDailyAttendancePeriods function.");
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = spreadsheet.getSheets();
  var clearedSheetsCount = 0;

  sheets.forEach(function(sheet) {
    var sheetName = sheet.getName();
    // Check if the sheet is one of our semester attendance sheets
    if (sheetName.endsWith(" Attendance")) {
      Logger.log("Processing sheet: " + sheetName);

      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      
      if (values.length <= 1) { // Only header row or empty sheet
        Logger.log("Sheet '" + sheetName + "' is empty or only has headers. No data to clear.");
        return; // Skip to next sheet
      }

      var headerRow = values[0];
      var periodColsToClear = [];

      // Find indices for Period 1 through Period 6
      for (var p = 1; p <= 6; p++) {
        var periodColIndex = headerRow.indexOf("Period " + p);
        if (periodColIndex !== -1) {
          periodColsToClear.push(periodColIndex);
        } else {
          Logger.log("WARNING: 'Period " + p + "' column not found in sheet '" + sheetName + "'.");
        }
      }

      if (periodColsToClear.length > 0) {
        // Determine the range to clear: from the second row (after headers) to the last row,
        // and only the columns identified as period columns.
        var numRows = sheet.getLastRow() - 1; // Number of data rows
        if (numRows > 0) {
          periodColsToClear.forEach(function(colIndex) {
            // getRange takes (row, column, numRows, numColumns)
            // column index is 0-based, so add 1 for A1 notation
            sheet.getRange(2, colIndex + 1, numRows, 1).clearContent();
          });
          Logger.log("Cleared " + periodColsToClear.length + " period columns for " + numRows + " rows in sheet: " + sheetName);
          clearedSheetsCount++;
        } else {
          Logger.log("No data rows to clear in sheet: " + sheetName);
        }
      } else {
        Logger.log("No period columns found to clear in sheet: " + sheetName);
      }
    }
  });

  Logger.log("Finished clearDailyAttendancePeriods function. Cleared data in " + clearedSheetsCount + " sheets.");
}