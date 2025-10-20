function doPost(e) {
  var response = {};
  var output = ContentService.createTextOutput();

  try {
    if (e && e.postData && e.postData.contents) {
      var requestBody = JSON.parse(e.postData.contents);
      Logger.log("Received request body: " + JSON.stringify(requestBody));

      var date = requestBody.date;
      var period = requestBody.period; // This is the specific period being submitted (e.g., 1, 2, 3)
      var semesterName = requestBody.semesterName;
      // var facultyName = requestBody.facultyName; // Removed as per request
      var studentsAttendance = requestBody.studentsAttendance; // Array of { name, roll_number, is_present }

      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var sheetName = semesterName + " Attendance";
      var sheet = spreadsheet.getSheetByName(sheetName);

      // Updated headers - removed "Faculty Name"
      var headers = ["Date", "Semester", "Student Name", "Roll Number", "Period 1", "Period 2", "Period 3", "Period 4", "Period 5", "Period 6"];
      
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        sheet.appendRow(headers);
        Logger.log("Created new sheet: " + sheetName + " with headers: " + JSON.stringify(headers));
      } else {
        var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        if (JSON.stringify(existingHeaders) !== JSON.stringify(headers)) {
          Logger.log("WARNING: Existing headers in sheet '" + sheetName + "' do not match expected headers. Expected: " + JSON.stringify(headers) + ", Found: " + JSON.stringify(existingHeaders));
          // For robust production, you might want to throw an error or attempt to fix headers.
          // For this exercise, we'll proceed assuming the sheet structure is correct or will be manually fixed.
        }
      }

      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues(); // Get all data from the sheet
      var headerRow = values[0]; // Assuming first row is header

      // Find column indices dynamically
      var dateCol = headerRow.indexOf("Date");
      var semesterCol = headerRow.indexOf("Semester");
      var studentNameCol = headerRow.indexOf("Student Name");
      var rollNumberCol = headerRow.indexOf("Roll Number");
      var targetPeriodCol = headerRow.indexOf("Period " + period);

      // Basic validation for column existence
      if (dateCol === -1 || semesterCol === -1 || studentNameCol === -1 || rollNumberCol === -1 || targetPeriodCol === -1) {
        throw new Error("One or more required columns not found in sheet: " + sheetName + ". Please ensure headers are correct: " + JSON.stringify(headers));
      }

      var updatedRowsCount = 0;
      var newRowsCount = 0;

      studentsAttendance.forEach(function(student) {
        var studentFound = false;
        var studentNameTrimmed = student.name.trim();
        var rollNumberTrimmed = student.roll_number.trim();

        for (var i = 1; i < values.length; i++) { // Start from 1 to skip header row
          var row = values[i];
          // Check if row matches date, semester, student name, and roll number (trimmed for robustness)
          if (row[dateCol] === date &&
              row[semesterCol] === semesterName &&
              String(row[studentNameCol]).trim() === studentNameTrimmed &&
              String(row[rollNumberCol]).trim() === rollNumberTrimmed) {
            
            // Found existing row, update it
            row[targetPeriodCol] = student.is_present ? "Present" : "Absent";
            // No faculty name column to update
            sheet.getRange(i + 1, 1, 1, row.length).setValues([row]); // Update the specific row
            studentFound = true;
            updatedRowsCount++;
            break;
          }
        }

        if (!studentFound) {
          // Create a new row for this student and date
          var newRow = new Array(headers.length).fill(""); // Initialize with empty strings
          newRow[dateCol] = date;
          newRow[semesterCol] = semesterName;
          newRow[studentNameCol] = student.name;
          newRow[rollNumberCol] = student.roll_number;
          newRow[targetPeriodCol] = student.is_present ? "Present" : "Absent";
          // No faculty name column to set
          sheet.appendRow(newRow);
          newRowsCount++;
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