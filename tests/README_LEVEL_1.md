# Hướng Dẫn Test Tự Động Level 1 - Basic API & Flow

Bộ test này chuyên dụng cho **LEVEL 1 (TC01 → TC10)** của Cab Booking System. File test được viết tại `level_1_adaptive.test.js`.

## 🌟 Cơ Chế Thích Ứng (Adaptive Strategy)
Một điểm đặc biệt của bộ test này là nó được thiết kế **Adaptive (linh hoạt)**. Trong phần đầu của file `level_1_adaptive.test.js`, cấu hình `SCHEMA_MAP` cho phép bạn map tên field theo tài liệu yêu cầu sang tên field thực tế trong database của bạn (nếu có khác biệt).
- **Trường dữ liệu:** Tài liệu ghi `user_id`, nhưng response của bạn trả `id` (hoặc `uuid`) -> Test tự động match.
- **Trạng thái:** Tài liệu ghi status của booking khi tạo là `REQUESTED`, nhưng của bạn là `PENDING` hoặc `SEARCHING` -> Vẫn PASS nếu đúng logic vòng đời.
- **Fallback:** AI ETA Model nếu timeout thì test sẽ chuyển sang giả lập khoảng cách địa lý (Haversine) để không block tiến trình chạy test.

---

## 🚀 Cách Chạy Test (Bằng PowerShell Script)

Dễ dàng nhất là chạy qua file script đã tạo sẵn (dành cho Windows):

1. Mở Terminal (PowerShell).
2. Chuyển vào thư mục `tests`:
   ```powershell
   cd tests
   ```
3. Chạy file script:
   ```powershell
   .\run_level_1.ps1
   ```

*(Script sẽ tự động cài `node_modules` nếu bạn chưa cài đặt, sau đó gọi Jest để trích xuất output kết quả ra màn hình. Kết quả in ra có màu sắc rõ ràng)*

---

## 💻 Cách Chạy Test Thủ Công (Node.js/npm)

Nếu không dùng PowerShell, bạn hoàn toàn có thể chạy bằng NodeJS thuần túy:

1. Đảm bảo đã cài NodeJS.
2. Từ thư mục `tests`, chạy lệnh sau để cài đặt Dependencies (chỉ cần làm lần đầu):
   ```bash
   npm install
   ```
3. Khởi động Test Suite bằng npm:
   ```bash
   npm run test:level1
   ```
   *Lệnh này tương đương với: `npx jest level_1_adaptive --verbose --forceExit --detectOpenHandles`*

---

## 🔎 Tổng Quan 10 Test Cases

| Test Case | Tiêu Đề | Logic Kiểm Tra Chống Lỗi (Validation) |
|---|---|---|
| **TC01** | Đăng ký user thành công | Gọi API `/api/auth/register`, HTTP 201, cấp phát logic `userId`. |
| **TC02** | Đăng nhập trả JWT hợp lệ | Gửi Credentials, lấy cấu trúc JWT token trích xuất `exp` và `sub`. |
| **TC03** | Tạo booking input hợp lệ | Lấy trạng thái của Booking lúc vừa tạo (phải nằm trong cụm Chờ xử lý). |
| **TC04** | Danh sách booking user | Danh sách chứa tối thiểu booking vừa tạo, có `_id` và `status`. |
| **TC05** | Tài xế Online | Cập nhật hồ sơ tài xế trạng thái `is_available: true`. |
| **TC06** | Trạng thái Booking | Trạng thái vừa sinh ra không được phép là đã nhận lệnh/hoàn thành. |
| **TC07** | ETA AI Model | ETA trả về số dương (phút). Gọi Model, rơi xuống Fail-safe thủ công khi service bị ngắt. |
| **TC08** | Pricing & Surge Pricing | Tính toán giá tiền `price > base` và hệ số nhân surge `>= 1`. |
| **TC09** | Gửi Alert/Notification | API trả truy vết list thông báo không bị Crash/Timeout. |
| **TC10** | Logout Invalidate Token | User gửi refreshToken đăng xuất, hệ thống xóa token. Verify lại trả 401. |

---

## ⚙️ Cấu Hình Nâng Cao
Nếu cấu trúc dự án bạn thay đổi Port API Gateway (hiện tại là 3000), thay đổi tham số này ở đầu file Javascript `level_1_adaptive.test.js`:

```javascript
const CONFIG = {
  // API Gateway base URL
  BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  TIMEOUT: 15000,
  // ...
};
```
Hoặc khi chạy bằng Bash/CMD/Powershell có thể tiêm trực tiếp biến môi trường:
```powershell
$env:TEST_BASE_URL="http://localhost:3000"; npm run test:level1
```
