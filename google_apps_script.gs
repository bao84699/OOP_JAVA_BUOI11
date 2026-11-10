/**
 * Google Apps Script cho trang "Bài giảng Kế thừa Java"
 * ----------------------------------------------------
 * Tự động tạo và cập nhật 3 trang tính (tab) trong Google Sheet của bạn:
 *   1. DiemDanh  — mỗi sinh viên 1 dòng: thời điểm vào lớp đầu tiên, lần gần nhất, số lần vào, trạng thái.
 *   2. TienDo    — mỗi sinh viên 1 dòng (cập nhật trực tiếp): điểm /10, XP, % hoàn thành, từng chặng, thời gian học.
 *   3. ChiTiet   — nhật ký từng lần trả lời bài tập (đúng / sai / xem đáp án, số lần thử, gợi ý, câu trả lời).
 *
 * CÁCH CÀI ĐẶT (chỉ mất ~2 phút):
 *   1. Mở Google Sheets -> tạo một bảng tính mới.
 *   2. Vào menu Tiện ích mở rộng (Extensions) -> Apps Script.
 *   3. Xóa mã mặc định, dán toàn bộ nội dung file này vào rồi bấm Lưu (Ctrl+S).
 *   4. Bấm Triển khai (Deploy) -> Triển khai mới (New deployment).
 *   5. Chọn loại: Ứng dụng web (Web app).
 *      - Thực thi dưới dạng (Execute as): Tôi (Me).
 *      - Ai có quyền truy cập (Who has access): Bất kỳ ai (Anyone).
 *   6. Bấm Triển khai, cấp quyền khi được hỏi, rồi sao chép URL Web App (dạng https://script.google.com/macros/s/.../exec).
 *   7. Dán URL đó vào biến CONFIG.SHEET_URL trong file HTML (hoặc bấm nút "Chưa nối Sheet" ngay trên trang web để dán).
 */

var TAB_ATTENDANCE = 'DiemDanh';
var TAB_PROGRESS   = 'TienDo';
var TAB_ATTEMPTS   = 'ChiTiet';

var HEAD_ATTENDANCE = [
  'MSSV', 'Họ và tên', 'Lớp', 'Trạng thái',
  'Điểm danh lần đầu', 'Hoạt động gần nhất', 'Số phiên vào học', 'Thiết bị'
];

var HEAD_PROGRESS = [
  'MSSV', 'Họ và tên', 'Lớp', 'Điểm (/10)', 'XP',
  'Hoàn thành', 'Tổng bài', 'Tiến độ (%)', 'Đúng ngay lần đầu', 'Xem đáp án',
  'Thời gian học (phút)', 'Chặng đang học',
  'Chặng 0 · Khởi động', 'Chặng 1 · extends & is-a', 'Chặng 2 · Constructor & super',
  'Chặng 3 · Ghi đè', 'Chặng 4 · Ép kiểu', 'Chặng 5 · final', 'Chặng 6 · Boss',
  'Huy hiệu', 'Cập nhật lúc'
];

var HEAD_ATTEMPTS = [
  'Thời gian', 'MSSV', 'Họ và tên', 'Lớp', 'Chặng',
  'Mã bài', 'Tên bài', 'Kết quả', 'Lần thử', 'Số gợi ý',
  'Độ tự tin', 'Câu trả lời', 'Mã sự kiện'
];

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets_(ss);
  var out = { ok: true, sheet: ss.getName(), time: fmtTime_(Date.now()) };
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '[]';
    var parsed = JSON.parse(raw);
    var events = Array.isArray(parsed) ? parsed : (parsed.events || [parsed]);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ensureSheets_(ss);

    events.forEach(function (ev) {
      if (!ev || !ev.mssv) return;
      var type = ev.type || (ev.baiTap ? 'attempt' : 'progress');
      touchAttendance_(sh.att, ev, type === 'checkin');
      if (type === 'progress') {
        upsertProgress_(sh.prog, ev);
      } else if (type === 'attempt') {
        appendAttempt_(sh.log, ev);
      }
    });

    return ContentService.createTextOutput(JSON.stringify({ ok: true, count: events.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function ensureSheets_(ss) {
  return {
    att:  getOrCreate_(ss, TAB_ATTENDANCE, HEAD_ATTENDANCE, '#7c5ce6'),
    prog: getOrCreate_(ss, TAB_PROGRESS,   HEAD_PROGRESS,   '#238f57'),
    log:  getOrCreate_(ss, TAB_ATTEMPTS,   HEAD_ATTEMPTS,   '#5683ec')
  };
}

function getOrCreate_(ss, name, headers, color) {
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold')
      .setBackground(color)
      .setFontColor('#ffffff');
    s.setFrozenRows(1);
  }
  return s;
}

function findRowByMssv_(sheet, mssv) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var col = sheet.getRange(2, 1, last - 1, 1).getValues();
  var key = String(mssv).trim().toUpperCase();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).trim().toUpperCase() === key) return i + 2;
  }
  return -1;
}

function touchAttendance_(sheet, ev, isCheckin) {
  var now = fmtTime_(ev.ts);
  var row = findRowByMssv_(sheet, ev.mssv);
  if (row < 0) {
    sheet.appendRow([
      ev.mssv, ev.ten || '', ev.lop || '', 'Có mặt',
      now, now, ev.lanDiemDanh || 1, ev.thietBi || ''
    ]);
  } else {
    var cur = sheet.getRange(row, 1, 1, HEAD_ATTENDANCE.length).getValues()[0];
    var count = Number(cur[6] || 1);
    if (isCheckin) count = Math.max(count + 1, Number(ev.lanDiemDanh || count));
    sheet.getRange(row, 1, 1, HEAD_ATTENDANCE.length).setValues([[
      ev.mssv,
      ev.ten || cur[1],
      ev.lop || cur[2],
      'Có mặt',
      cur[4] || now,
      now,
      count,
      ev.thietBi || cur[7]
    ]]);
  }
}

function upsertProgress_(sheet, ev) {
  var c = ev.chang || {};
  var values = [
    ev.mssv,
    ev.ten || '',
    ev.lop || '',
    ev.diem != null ? ev.diem : '',
    ev.xp != null ? ev.xp : 0,
    ev.hoanThanh != null ? ev.hoanThanh : 0,
    ev.tongBai != null ? ev.tongBai : 0,
    ev.phanTram != null ? ev.phanTram : 0,
    ev.dungNgay != null ? ev.dungNgay : 0,
    ev.xemDapAn != null ? ev.xemDapAn : 0,
    ev.thoiGianPhut != null ? ev.thoiGianPhut : 0,
    ev.changHienTai || '',
    c['Chặng 0 · Khởi động'] || '',
    c['Chặng 1 · extends & is-a'] || '',
    c['Chặng 2 · Constructor & super'] || '',
    c['Chặng 3 · Ghi đè'] || '',
    c['Chặng 4 · Ép kiểu'] || '',
    c['Chặng 5 · final'] || '',
    c['Chặng 6 · Boss'] || '',
    ev.huyHieu || '',
    fmtTime_(ev.ts)
  ];
  var row = findRowByMssv_(sheet, ev.mssv);
  if (row < 0) {
    sheet.appendRow(values);
  } else {
    sheet.getRange(row, 1, 1, values.length).setValues([values]);
  }
}

function appendAttempt_(sheet, ev) {
  sheet.appendRow([
    fmtTime_(ev.ts),
    ev.mssv,
    ev.ten || '',
    ev.lop || '',
    ev.chang != null ? ev.chang : '',
    ev.baiTap || '',
    ev.tenBai || '',
    ev.ketQua || '',
    ev.lanThu != null ? ev.lanThu : '',
    ev.goiY != null ? ev.goiY : 0,
    ev.tuTin || '',
    ev.traLoi || '',
    ev.eid || ''
  ]);
}

function fmtTime_(ts) {
  var d = ts ? new Date(Number(ts)) : new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
}
