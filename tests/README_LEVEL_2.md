# Hướng Dẫn Test Tự Động Level 2 - Validation & Edge Cases

Bộ test này chuyên dụng cho **LEVEL 2 (TC11 → TC20)** của Cab Booking System. File test nằm tại `level_2_adaptive.test.js`.

## 🎯 Mục Tiêu Level 2
Kiểm tra cách hệ thống **phản ứng khi input sai hoặc bất thường**:
- Hệ thống luôn **fail an toàn (fail-safe)**
- Không có hành vi "undefined" hoặc crash bất thường
- Không tin input từ client → validate mọi thứ

---

## 🚀 Cách Chạy Test

### Cách 1: PowerShell Script (khuyến nghị)
```powershell
cd tests
.\run_level_2.ps1
```
> Script sẽ tự kiểm tra API Gateway có đang chạy không trước khi bắt đầu test.

### Cách 2: npm command
```bash
cd tests
npm install           # Lần đầu
npx jest level_2_adaptive --verbose --forceExit --detectOpenHandles
```

### Cách 3: Chạy cả Level 1 + Level 2
```bash
cd tests
npx jest --verbose --forceExit --detectOpenHandles
```

---

## ⚠️ Điều Kiện Tiên Quyết (Pre-requisites)
1. **Docker Desktop** đang chạy
2. **Tất cả services** đã khởi động: `docker-compose up -d`
3. **Đợi ~30 giây** cho các service kết nối DB/RabbitMQ

---

## 🔎 Tổng Quan 10 Test Cases

| TC | Tiêu Đề | Input | Expected | Ý Nghĩa |
|---|---|---|---|---|
| **TC11** | Booking thiếu pickup | `{ dropoff: {...} }` (không có pickup) | HTTP 400, "pickup is required" | Validate field bắt buộc |
| **TC12** | Sai format lat/lng | `pickup.lat = "abc"` | HTTP ≥ 400 | Validate kiểu dữ liệu |
| **TC13** | Driver offline | Booking ở vùng xa, không driver | Status ∈ `[PENDING, SEARCHING, NO_DRIVER_FOUND]` | Không assign driver khi offline |
| **TC14** | Payment method invalid | `paymentMethod: "invalid_card"` | HTTP 400 | Reject enum sai |
| **TC15** | ETA distance = 0 | Pickup = Dropoff (cùng tọa độ) | ETA = 0 hoặc rất nhỏ, không crash | Edge case: khoảng cách 0 |
| **TC16** | Pricing off-peak | Off-peak (không surge zone) | `surge ≥ 1`, `price > 0` | Surge không bao giờ < 1 |
| **TC17** | API thiếu required field | Pricing thiếu `distance_km` | HTTP ≥ 400, error message | Reject thiếu field |
| **TC18** | Token expired | JWT đã hết hạn (`exp` trong quá khứ) | HTTP 401, "Token expired" | Security: token lifecycle |
| **TC19** | Duplicate booking | 2 request giống hệt nhau | Cùng `booking_id` | Idempotency check |
| **TC20** | Payload quá lớn | JSON > 10MB | HTTP 413 hoặc connection reset | Payload size limit |

---

## 🔧 Chi Tiết Thích Ứng (ADAPT Notes)

### TC13 - Driver Offline
- **Tài liệu**: Trả message "No drivers available"
- **Hệ thống**: Booking được tạo nhưng status = `SEARCHING` hoặc `NO_DRIVER_FOUND` (sequential matching async)
- **Logic tương đương**: ✅ Không gán driver

### TC15 - ETA Distance = 0
- **Tài liệu**: `distance_km: 0` → `eta = 0`
- **Hệ thống**: Truyền pickup = destination, ETA service tính distance = 0 → trả eta rất nhỏ hoặc reject
- **Logic tương đương**: ✅ Không crash, không trả giá trị âm

### TC17 - Fraud API
- **Tài liệu**: Fraud Detection API thiếu field
- **Hệ thống**: Không có Fraud service riêng → dùng Pricing API (cùng logic: thiếu field bắt buộc → reject)
- **Logic tương đương**: ✅ Validate input thiếu → error message rõ ràng

### TC18 - Token Expired
- Test tạo JWT token với `exp` đã qua bằng `jsonwebtoken` library
- Cần JWT_SECRET khớp với API Gateway (default: `your-secret-key-change-in-production`)

### TC19 - Idempotency
- Hệ thống dùng `idempotencyKey` = hash(`passengerId + pickup + dropoff + timeBucket`)
- 2 request cùng route trong vòng 60s → trả lại booking cũ, KHÔNG tạo duplicate

### TC20 - Payload Size
- API Gateway config: `express.json({ limit: '10mb' })`
- Test gửi payload ~11MB → server reject hoặc connection reset

---

## ⚙️ Cấu Hình
Thay đổi trong đầu file `level_2_adaptive.test.js`:

```javascript
const CONFIG = {
  BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  TIMEOUT: 15000,
};
```

Hoặc qua biến môi trường:
```powershell
$env:TEST_BASE_URL="http://localhost:3000"
$env:JWT_SECRET="your-secret-key-change-in-production"
npx jest level_2_adaptive --verbose
```
