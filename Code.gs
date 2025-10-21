/**
 * @file Code.gs
 * @description Google Apps Script to create monthly spreadsheets and copy daily data.
 */

// IMPORTANT: Replace 'YOUR_SOURCE_SPREADSHEET_ID_HERE' with the actual ID of your source spreadsheet.
// You can find the spreadsheet ID in its URL: https://docs.google.com/spreadsheets/d/YOUR_SOURCE_SPREADSHEET_ID_HERE/edit
const SOURCE_SPREADSHEET_ID = 'YOUR_SOURCE_SPREADSHEET_ID_HERE';

/**
 * Creates a new Google Sheet for the current month and year,
 * and populates it with sheets named '1' through '31'.
 * If a spreadsheet for the current month already exists in your Drive, it will use that one.
 * @param {string} monthYearName The desired name for the spreadsheet (e.g., "September 2024").
 * @returns {string} The ID of the created or found spreadsheet.
 */
function createAndConfigureMonthlySpreadsheet(monthYearName) {
  // Check if a spreadsheet with this name already exists in Drive
  const files = DriveApp.getFilesByName(monthYearName);
  if (files.hasNext()) {
    const file = files.next();
    Logger.log(`Found existing spreadsheet: ${monthYearName} (ID: ${file.getId()}). Using it.`);
    return file.getId();
  }

  // If not found, create a new spreadsheet
  const ss = SpreadsheetApp.create(monthYearName);
  const spreadsheetId = ss.getId();

  // Rename the default Sheet1 to '1'
  const defaultSheet = ss.getSheets()[0];
  defaultSheet.setName('1');

  // Add sheets '2' through '31'
  for (let i = 2; i <= 31; i++) {
    ss.insertSheet(String(i));
  }

  Logger.log(`Created new spreadsheet: ${monthYearName} (ID: ${spreadsheetId}) with 31 sheets.`);
  return spreadsheetId;
}

/**
 * Retrieves the ID of the current month's spreadsheet.
 * If it doesn't exist, it calls `createAndConfigureMonthlySpreadsheet` to create it.
 * It stores the ID in User Properties for efficient retrieval on subsequent days.
 * @returns {string} The ID of the current month's spreadsheet.
 */
function getOrCreateCurrentMonthSpreadsheetId() {
  const today = new Date();
  const monthYearName = Utilities.formatDate(today, Session.getScriptTimeZone(), 'MMMM yyyy');
  const currentMonthKey = `spreadsheetId_${monthYearName.replace(/\s/g, '_')}`; // Key for PropertiesService

  let spreadsheetId = PropertiesService.getUserProperties().getProperty(currentMonthKey);

  if (!spreadsheetId) {
    // If ID not in properties, create/find the spreadsheet and store its ID
    spreadsheetId = createAndConfigureMonthlySpreadsheet(monthYearName);
    PropertiesService.getUserProperties().setProperty(currentMonthKey, spreadsheetId);
  }
  return spreadsheetId;
}

/**
 * Copies data from 'Sheet1' and 'Sheet2' of the source spreadsheet
 * to the sheet corresponding to the current day in the current month's spreadsheet.
 */
function copyDataToDailySheet() {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const sheetName = String(dayOfMonth); // Target sheet name (e.g., "1", "2", ...)

  try {
    const targetSpreadsheetId = getOrCreateCurrentMonthSpreadsheetId();
    const targetSpreadsheet = SpreadsheetApp.openById(targetSpreadsheetId);
    let targetSheet = targetSpreadsheet.getSheetByName(sheetName);

    // If the target sheet for the current day doesn't exist, create it
    if (!targetSheet) {
      Logger.log(`Target sheet '${sheetName}' not found in spreadsheet '${targetSpreadsheet.getName()}'. Creating it.`);
      targetSheet = targetSpreadsheet.insertSheet(sheetName);
      // Optionally, reorder sheets if needed. For simplicity, new sheets are added at the end.
    }

    // Clear existing content in the target sheet to ensure a fresh paste
    targetSheet.clearContents();
    targetSheet.clearFormats();

    const sourceSpreadsheet = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
    const sourceSheet1 = sourceSpreadsheet.getSheetByName('Sheet1');
    const sourceSheet2 = sourceSpreadsheet.getSheetByName('Sheet2');

    if (!sourceSheet1) throw new Error('Source Sheet1 not found in the source spreadsheet.');
    if (!sourceSheet2) throw new Error('Source Sheet2 not found in the source spreadsheet.');

    // Copy data from Sheet1
    const sourceRange1 = sourceSheet1.getDataRange();
    const values1 = sourceRange1.getValues();
    const numRows1 = values1.length;
    const numCols1 = values1[0] ? values1[0].length : 0;

    if (numRows1 > 0 && numCols1 > 0) {
      targetSheet.getRange(1, 1, numRows1, numCols1).setValues(values1);
      Logger.log(`Copied ${numRows1} rows from Sheet1 to ${sheetName}.`);
    } else {
      Logger.log('No data found in Source Sheet1 to copy.');
    }

    // Copy data from Sheet2, starting below the first pasted data
    const lastRowAfterPaste1 = targetSheet.getLastRow();
    const sourceRange2 = sourceSheet2.getDataRange();
    const values2 = sourceRange2.getValues();
    const numRows2 = values2.length;
    const numCols2 = values2[0] ? values2[0].length : 0;

    if (numRows2 > 0 && numCols2 > 0) {
      targetSheet.getRange(lastRowAfterPaste1 + 1, 1, numRows2, numCols2).setValues(values2);
      Logger.log(`Copied ${numRows2} rows from Sheet2 to ${sheetName}, starting at row ${lastRowAfterPaste1 + 1}.`);
    } else {
      Logger.log('No data found in Source Sheet2 to copy.');
    }

    Logger.log(`Data copied successfully to sheet '${sheetName}' in '${targetSpreadsheet.getName()}'.`);

  } catch (e) {
    Logger.log(`Error in copyDataToDailySheet: ${e.message}`);
    throw e; // Re-throw to indicate failure
  }
}

/**
 * Main function to be called by a daily trigger.
 * It ensures the monthly spreadsheet is ready and copies data to the daily sheet.
 */
function dailyTriggerFunction() {
  const today = new Date();
  const dayOfMonth = today.getDate();

  // On the first day of the month, ensure the new spreadsheet is created/identified
  if (dayOfMonth === 1) {
    Logger.log('It is the first day of the month. Ensuring monthly spreadsheet is ready.');
    getOrCreateCurrentMonthSpreadsheetId(); // This will create if not exists and store ID
  }

  // Copy data to the daily sheet
  copyDataToDailySheet();
}

/**
 * Sets up a daily time-driven trigger for `dailyTriggerFunction`.
 * This function should be run ONCE manually to initialize the trigger.
 */
function setupDailyTrigger() {
  // Delete existing triggers for this function to prevent duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'dailyTriggerFunction') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Create a new daily trigger to run `dailyTriggerFunction` at 1 AM every day
  ScriptApp.newTrigger('dailyTriggerFunction')
      .timeBased()
      .everyDays(1)
      .atHour(1) // Adjust the hour (0-23) as needed, e.g., 1 for 1 AM
      .create();
  Logger.log('Daily trigger for dailyTriggerFunction set up to run at 1 AM.');
}

/**
 * Initialization function to be run ONCE manually.
 * It sets up the daily trigger and runs the daily function immediately.
 */
function initialize() {
  setupDailyTrigger();
  dailyTriggerFunction(); // Run once immediately after setup
}