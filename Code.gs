/**
 * Digital Timetable — Google Apps Script (Code.gs)
 * Menghantar SEMUA tab Google Sheet (format eksport aSc TimeTables) sebagai JSON
 * kepada aplikasi Digital Timetable.
 *
 * CARA PASANG:
 * 1. Buka Google Sheet > Sambungan (Extensions) > Apps Script.
 * 2. Padam kod sedia ada, tampal SEMUA kod ini, klik Simpan.
 * 3. Klik Deploy > New deployment > jenis "Web app".
 *      Execute as : Me (saya)
 *      Who has access : Anyone (Sesiapa sahaja)
 * 4. Klik Deploy, benarkan akses (Authorize), salin "Web app URL" (berakhir /exec).
 * 5. Dalam app Digital Timetable > menu Google Sheet, tampal URL /exec itu > Muat & bina jadual.
 * Selepas ubah kod: Deploy > Manage deployments > Edit > Version: New version > Deploy.
 */

var SPREADSHEET_ID = '12JX7U3KjfqRIr3HryEejK6xWqg2k8_ZH6YNTjDFQ45s';

function doGet(e) {
  var out;
  try {
    out = { ok: true, updated: new Date().toISOString(), tabs: readAllTabs_() };
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    out.name = ss.getName();
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  var json = JSON.stringify(out);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb && /^[A-Za-z_$][\w$]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function readAllTabs_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var tabs = {};
  ss.getSheets().forEach(function (sh) {
    var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
    if (lastRow < 1 || lastCol < 1) { tabs[sh.getName()] = []; return; }
    var values = sh.getRange(1, 1, lastRow, Math.min(lastCol, 60)).getDisplayValues();
    var rows = [];
    values.forEach(function (r) {
      var a = r.map(function (c) { return String(c == null ? '' : c); });
      while (a.length && !a[a.length - 1].trim()) a.pop();
      if (a.length) rows.push(a);
    });
    tabs[sh.getName()] = rows;
  });
  return tabs;
}

/** Jalankan sekali dari editor untuk uji & beri kebenaran. Lihat hasil di Execution log. */
function testRead() {
  var t = readAllTabs_();
  Object.keys(t).forEach(function (k) { Logger.log(k + ': ' + t[k].length + ' baris'); });
}
