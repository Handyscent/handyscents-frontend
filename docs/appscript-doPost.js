/**
 * Apps Script doPost - INSERT new row (no form trigger).
 * Deploy as Web app: Execute as "Me" (not "User accessing") so DriveApp has permission.
 * Who has access: Anyone (or Anyone with Google account).
 * Set Script Properties: PARENT_FOLDER_ID (default: Orders folder), APPSCRIPT_SECRET (optional).
 *
 * Flow: For each order (e.g. #9999), a subfolder named by order ID (e.g. 9999) is created inside
 * the Orders folder. That folder gets: the 5 uploaded images and the two QR images (from POST submittedQr / confirmationQr).
 *
 * For images/Drive to work: Deploy as "Execute as: Me", run authorizeDrive() once, set PARENT_FOLDER_ID if needed.
 *
 * QR images: Saved in background by processPendingQr() so doPost returns faster. Queue in sheet "PendingQR".
 */

var NUM_COLUMNS = 15;
var COL_SUBMITTED_QR = 6;
var COL_CONFIRMATION_QR = 8;
var PENDING_QR_SHEET_NAME = 'PendingQR';
var STATUS_OPTIONS = ['Uploaded – Under Review', 'Replacement Requested', 'Approved'];
var DEFAULT_PARENT_FOLDER_ID = '1rgjHjkO3pNXtOpLW4rQPVv9T331z_H5S';

function normalizeOrderId(v) {
  return (v && v.toString().replace(/^#/, '').replace(/\s/g, '')) || '';
}

/** Run once from editor to grant Drive permission (fixes "Access denied: DriveApp"). */
function authorizeDrive() {
  DriveApp.getRootFolder().getName();
  Logger.log('Drive authorized.');
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ message: 'Use POST' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Optional: validate secret
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('APPSCRIPT_SECRET');
    if (expectedSecret && data.secret !== expectedSecret) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Required fields
    if (!data.orderNumber || !normalizeOrderId(data.orderNumber)) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Order number is required' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const orderId = normalizeOrderId(data.orderNumber) || 'ORDER';
    let submittedQrLink = (data.submittedQrUrl || data.submittedQr || '').toString().trim();
    let confirmationQrLink = (data.confirmationQrUrl || data.confirmationQr || '').toString().trim();

    // Idempotency: if this order number already exists in the sheet, return success without creating duplicate
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const currentLastRow = sheet.getLastRow();
    if (currentLastRow >= 2) {
      const orderNumbers = sheet.getRange(2, 2, currentLastRow, 2).getValues();
      for (var r = 0; r < orderNumbers.length; r++) {
        if (normalizeOrderId(orderNumbers[r][0]) === orderId) {
          return ContentService.createTextOutput(JSON.stringify({ success: true, duplicate: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // Drive: create folder, save 5 images + QR images from POST (requires "Execute as: Me").
    const driveFailedMsg = '(Drive failed: set Execute as Me, run authorizeDrive(), set PARENT_FOLDER_ID)';
    let imageLinks = ['', '', '', '', ''];
    try {
      const parentFolderId = PropertiesService.getScriptProperties().getProperty('PARENT_FOLDER_ID') || DEFAULT_PARENT_FOLDER_ID;
      const parentFolder = DriveApp.getFolderById(parentFolderId);
      const newFolder = parentFolder.createFolder('#'+orderId);

      // Save 5 order images into this folder
      for (let i = 1; i <= 5; i++) {
        const base64 = data['image' + i + 'Base64'];
        const fileName = data['image' + i + 'Name'] || (orderId + '_Image' + i + '.jpg');
        if (base64 && typeof base64 === 'string') {
          try {
            const mime = (fileName || '').toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            const blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, fileName);
            const file = newFolder.createFile(blob);
            imageLinks[i - 1] = file.getUrl();
          } catch (err) {
            Logger.log('Image ' + i + ' save failed: ' + err);
            imageLinks[i - 1] = '(save failed)';
          }
        }
      }

      // QR images are saved later by processPendingQr() trigger (faster response)
    } catch (driveErr) {
      Logger.log('Drive access failed: ' + driveErr);
      imageLinks[0] = driveFailedMsg;
    }

    // Append row to sheet (only clear header validations when sheet is empty)
    if (sheet.getLastRow() === 0) sheet.getRange('A1:O1').clearDataValidations();
    const headers = [
      'Date',
      'Order Number',
      'Creator Name',
      'Quantity Ordered',
      'Submitted URL',
      'Submitted QR Link',
      'Order Confirmation Link',
      'Confirmation QR Link',
      'Message',
      'Image 1',
      'Image 2',
      'Image 3',
      'Image 4',
      'Image 5',
      'Status'
    ];
    if (sheet.getLastRow() === 0) {
      for (var c = 0; c < NUM_COLUMNS; c++) {
        sheet.getRange(1, c + 1).setValue(headers[c]);
      }
      sheet.getRange(1, 1, 1, NUM_COLUMNS).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    const status = 'Uploaded – Under Review';
    const row = [
      new Date(),
      data.orderNumber || '',
      data.creatorName || '',
      data.quantityOrdered || '',
      data.submittedUrl || '',
      submittedQrLink,
      data.orderConfirmationLink || '',
      confirmationQrLink,
      data.message || '',
      imageLinks[0] || '',
      imageLinks[1] || '',
      imageLinks[2] || '',
      imageLinks[3] || '',
      imageLinks[4] || '',
      status
    ];
    const lastRow = sheet.getLastRow() + 1;
    for (var c = 0; c < NUM_COLUMNS; c++) {
      sheet.getRange(lastRow, c + 1).setValue(row[c]);
    }

    // Data validation and color for Status (column O) — only on data row, never on header row 1
    if (lastRow > 1) {
      const statusCell = sheet.getRange('O' + lastRow);
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(STATUS_OPTIONS, true)
        .setAllowInvalid(false)
        .build();
      statusCell.setDataValidation(rule);
      statusCell.setBackground('#FFF59D');
    }

    // Queue QR image save for background (processPendingQr runs in ~1 min)
    if ((submittedQrLink && submittedQrLink.indexOf('http') === 0) || (confirmationQrLink && confirmationQrLink.indexOf('http') === 0)) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var pendingSheet = ss.getSheetByName(PENDING_QR_SHEET_NAME);
      if (!pendingSheet) {
        pendingSheet = ss.insertSheet(PENDING_QR_SHEET_NAME);
        pendingSheet.getRange(1, 1, 1, 4).setValues([['OrderId', 'MainSheetRow', 'SubmittedQrUrl', 'ConfirmationQrUrl']]);
        pendingSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
      }
      pendingSheet.appendRow([orderId, lastRow, submittedQrLink || '', confirmationQrLink || '']);
      try {
        var triggers = ScriptApp.getProjectTriggers();
        var hasQr = false;
        for (var ti = 0; ti < triggers.length; ti++) {
          if (triggers[ti].getHandlerFunction() === 'processPendingQr') { hasQr = true; break; }
        }
        if (!hasQr) ScriptApp.newTrigger('processPendingQr').timeBased().after(60000).create();
      } catch (triggerErr) {
        Logger.log('Trigger create failed: ' + triggerErr);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('doPost error: ' + err);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Runs on a time-based trigger (~1 min after order). Fetches QR images from queued URLs,
 * saves to Drive folder, updates main sheet with Drive links. Remove trigger when done.
 */
function processPendingQr() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mainSheet = ss.getSheets()[0];
  var pendingSheet = ss.getSheetByName(PENDING_QR_SHEET_NAME);
  if (!pendingSheet || pendingSheet.getLastRow() < 2) return;

  var parentFolderId = PropertiesService.getScriptProperties().getProperty('PARENT_FOLDER_ID') || DEFAULT_PARENT_FOLDER_ID;
  var parentFolder = DriveApp.getFolderById(parentFolderId);
  var data = pendingSheet.getRange(2, 1, pendingSheet.getLastRow(), 4).getValues();
  var rowsToDelete = [];

  for (var i = 0; i < data.length; i++) {
    var orderId = data[i][0].toString().trim();
    var mainRow = parseInt(data[i][1], 10);
    var submittedUrl = (data[i][2] && data[i][2].toString().trim()) || '';
    var confirmationUrl = (data[i][3] && data[i][3].toString().trim()) || '';
    if (!orderId || !mainRow) continue;

    var submittedDriveUrl = '';
    var confirmationDriveUrl = '';
    try {
      var folders = parentFolder.getFoldersByName('#' + orderId);
      if (!folders.hasNext()) continue;
      var folder = folders.next();
      if (submittedUrl && submittedUrl.indexOf('http') === 0) {
        try {
          var blob = UrlFetchApp.fetch(submittedUrl).getBlob().setName(orderId + '_SubmittedUrl_QR.png');
          var file = folder.createFile(blob);
          submittedDriveUrl = file.getUrl();
        } catch (e) { Logger.log('QR submitted fetch failed: ' + e); }
      }
      if (confirmationUrl && confirmationUrl.indexOf('http') === 0) {
        try {
          var blob2 = UrlFetchApp.fetch(confirmationUrl).getBlob().setName(orderId + '_Confirmation_QR.png');
          var file2 = folder.createFile(blob2);
          confirmationDriveUrl = file2.getUrl();
        } catch (e) { Logger.log('QR confirmation fetch failed: ' + e); }
      }
      if (submittedDriveUrl) mainSheet.getRange(mainRow, COL_SUBMITTED_QR).setValue(submittedDriveUrl);
      if (confirmationDriveUrl) mainSheet.getRange(mainRow, COL_CONFIRMATION_QR).setValue(confirmationDriveUrl);
    } catch (e) {
      Logger.log('processPendingQr row error: ' + e);
    }
    rowsToDelete.push(i + 2);
  }

  for (var d = rowsToDelete.length - 1; d >= 0; d--) {
    pendingSheet.deleteRow(rowsToDelete[d]);
  }


  var triggers = ScriptApp.getProjectTriggers();
  for (var t = 0; t < triggers.length; t++) {
    if (triggers[t].getHandlerFunction() === 'processPendingQr') ScriptApp.deleteTrigger(triggers[t]);
  }
}

