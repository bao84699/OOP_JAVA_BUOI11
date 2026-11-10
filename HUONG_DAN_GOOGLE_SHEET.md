# Hướng dẫn kết nối Google Sheet (Điểm danh & Theo dõi tiến độ)

Trang **Bài giảng Kế thừa Java** tự động gửi dữ liệu sang Google Sheets gồm **3 bảng (tab)**:

| Tên tab | Nội dung |
| :--- | :--- |
| **`DiemDanh`** | Mỗi sinh viên 1 dòng: MSSV, Họ tên, Lớp, trạng thái **Có mặt**, giờ vào lớp đầu tiên, hoạt động gần nhất, số phiên vào học. |
| **`TienDo`** | Mỗi sinh viên 1 dòng (cập nhật trực tiếp khi làm bài): **Điểm (/10)**, XP, số bài hoàn thành, % tiến độ, kết quả từng chặng (0 → 6), thời gian học (phút), huy hiệu. |
| **`ChiTiet`** | Nhật ký từng lượt trả lời câu hỏi: thời gian, MSSV, chặng, mã bài, đúng/sai/xem đáp án, lần thử thứ mấy, số gợi ý đã mở, câu trả lời đã chọn. |

---

## Cách 1: Tự động đồng bộ trực tiếp lên Google Sheet (Khuyên dùng)

### Bước 1 — Tạo Google Apps Script Web App
1. Mở [Google Sheets](https://sheets.new) để tạo một bảng tính mới và đặt tên (ví dụ: `Lớp OOP - Kế thừa Java`).
2. Trên thanh menu của Google Sheet, chọn **Tiện ích mở rộng (Extensions)** → **Apps Script**.
3. Xóa đoạn mã mặc định trong trình soạn thảo, mở file [`google_apps_script.gs`](./google_apps_script.gs) trong thư mục này, **sao chép toàn bộ** và dán vào Apps Script. Bấm **Ctrl + S** để lưu.
4. Bấm nút **Triển khai (Deploy)** ở góc phải trên → **Triển khai mới (New deployment)**.
5. Bấm biểu tượng bánh răng ⚙ bên cạnh *Chọn loại* → chọn **Ứng dụng web (Web app)**:
   - **Thực thi dưới dạng (Execute as):** `Tôi (Me)`
   - **Ai có quyền truy cập (Who has access):** `Bất kỳ ai (Anyone)` *(bắt buộc để trình duyệt của sinh viên gửi bài không bị chặn)*
6. Bấm **Triển khai (Deploy)** → cấp quyền (nếu Google hỏi: chọn tài khoản của bạn → *Advanced / Nâng cao* → *Go to … (unsafe)* → *Allow*).
7. Sao chép **URL ứng dụng web** (có dạng `https://script.google.com/macros/s/AKfycb.../exec`).

### Bước 2 — Gắn URL vào trang web (chọn 1 trong 3 cách)
- **Cách A (cố định trong code trước khi gửi file cho lớp):** Mở file `Bài giảng Kế thừa Java.html` bằng trình soạn thảo, tìm dòng `SHEET_URL:''` ở phần `CONFIG` và dán URL vào giữa cặp nháy đơn.
- **Cách B (dán trực tiếp trên giao diện):** Mở trang web, bấm nút **Chưa nối Sheet** trên thanh trên cùng (hoặc avatar góc phải) → dán URL → bấm **Lưu URL** rồi bấm **Kiểm tra**.
- **Cách C (gửi link kèm tham số):** Khi host trang web lên GitHub Pages / Netlify / Vercel, gửi cho sinh viên đường link:
  ```text
  https://<địa-chỉ-trang-của-bạn>/Bài%20giảng%20Kế%20thừa%20Java.html?sheet=<URL_WEB_APP>
  ```
  Trang sẽ tự lưu URL vào máy sinh viên và ẩn tham số khỏi thanh địa chỉ.

---

## Cách 2: Xuất file CSV không cần cài đặt

Nếu không dùng Google Apps Script, sinh viên hoặc giảng viên có thể bấm nút **Tải CSV / Xuất CSV** ngay trên trang **Tổng quan** hoặc **Tổng kết**. File `KeThua_<MSSV>.csv` tải về có sẵn chuẩn UTF-8 tiếng Việt, mở trực tiếp bằng **Google Sheets** (*Tệp → Nhập → Tải lên*) hoặc Microsoft Excel.
