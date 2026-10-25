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
// Kata laluan untuk butang "Kosongkan" & "Muat naik Excel" dalam app. TUKAR kepada kata laluan anda sendiri.
var ADMIN_KEY = '101010';

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

function doPost(e) {
  var out;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!body.key || body.key !== ADMIN_KEY) throw new Error('Kata laluan admin salah.');
    var lock = LockService.getScriptLock(); lock.waitLock(30000);
    try {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      if (body.action === 'clear') {
        var sheets = ss.getSheets();
        sheets.forEach(function (sh, i) { if (i === 0) { sh.clear(); sh.setName('Sheet1'); } else ss.deleteSheet(sh); });
        out = { ok: true, sheets: sheets.length };
      } else if (body.action === 'replace') {
        var tabs = body.tabs || {}, names = Object.keys(tabs);
        if (!names.length) throw new Error('Fail Excel kosong.');
        var tmp = ss.insertSheet('__tmp_' + Date.now());
        ss.getSheets().forEach(function (sh) { if (sh.getSheetId() !== tmp.getSheetId()) ss.deleteSheet(sh); });
        names.forEach(function (n) {
          var sh = ss.insertSheet(String(n).slice(0, 99));
          var rows = tabs[n] || []; if (!rows.length) return;
          var w = 0; rows.forEach(function (r) { if (r.length > w) w = r.length; });
          var data = rows.map(function (r) { var a = r.map(String); while (a.length < w) a.push(''); return a; });
          var rg = sh.getRange(1, 1, data.length, w); rg.setNumberFormat('@'); rg.setValues(data);
        });
        ss.deleteSheet(tmp);
        out = { ok: true, sheets: names.length };
      } else if (body.action === 'saveState') {
        var st = ss.getSheetByName('_APP_STATE') || ss.insertSheet('_APP_STATE');
        st.clear(); var ch = (body.chunks || []).map(function (c) { return [String(c)]; });
        if (ch.length) { var r1 = st.getRange(1, 1, ch.length, 1); r1.setNumberFormat('@'); r1.setValues(ch); }
        st.hideSheet();
        var rd = body.readable || [];
        var jt = ss.getSheetByName('JADUAL APP') || ss.insertSheet('JADUAL APP');
        jt.clear();
        if (rd.length) { var w = rd[0].length; var r2 = jt.getRange(1, 1, rd.length, w); r2.setNumberFormat('@'); r2.setValues(rd.map(function (r) { var x = r.map(String); while (x.length < w) x.push(''); return x.slice(0, w); })); jt.getRange(1, 1, 1, w).setFontWeight('bold'); }
        out = { ok: true, saved: body.at };
      } else throw new Error('Arahan tidak dikenali.');
    } finally { lock.releaseLock(); }
  } catch (err) { out = { ok: false, error: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
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
