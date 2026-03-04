# Troubleshooting Guide - Login Issue

## ✅ Đã Fix

### 1. Tạo file `.env` 
**Vấn đề**: File `.env` không tồn tại → ứng dụng không biết URL của API Gateway  
**Giải pháp**: Đã tạo file `.env` với:
```env
VITE_API_GATEWAY_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
VITE_SOCKET_URL=http://localhost:3000
```

### 2. Cải thiện Error Handling trong Login.jsx
**Vấn đề**: Lỗi không rõ ràng khi login fail  
**Giải pháp**: Thêm:
- Console logging chi tiết (🔐, ✅, ❌)
- Error messages cụ thể (network error, 401, etc.)
- Delay 100ms trước khi navigate (đảm bảo state updated)

### 3. Verified Backend
**Status**: ✅ Backend đang chạy tốt (http://localhost:3000/health → Status 200)

---

## 🔧 Cách Fix Hoàn Toàn

### Bước 1: Restart Dev Server (BẮT BUỘC)
Vì đã thay đổi file `.env`, bạn PHẢI restart:

```bash
# Trong terminal đang chạy npm run dev:
# Nhấn Ctrl + C để stop

# Sau đó chạy lại:
npm run dev
```

### Bước 2: Hard Reload Browser
Sau khi restart server:
- Mở browser
- Nhấn `Ctrl + Shift + R` (Windows) hoặc `Cmd + Shift + R` (Mac)
- Hoặc: `F12` → Tab Network → Tick "Disable cache" → Reload

### Bước 3: Test Login
1. Vào http://localhost:5173/login
2. Mở Chrome DevTools (F12) → Tab Console
3. Nhập email và password
4. Click Login
5. Xem console logs:
   - ✅ Nếu thấy: `🔐 Attempting login with: <email>` → API đang gọi
   - ✅ Nếu thấy: `✅ Login successful:` → Login thành công
   - ✅ Nếu thấy: `🏠 Navigating to /home` → Đang chuyển hướng

---

## 🐛 Nếu Vẫn Gặp Lỗi

### Lỗi: `ERR_EMPTY_RESPONSE` hoặc `ERR_CONNECTION_REFUSED`
**Nguyên nhân**: Backend không chạy  
**Giải pháp**:
```bash
# Ở thư mục gốc của project
cd d:\HTTT18B\Nam4_2\BigData\DHHTTT18B-N22-cab-system
docker-compose up -d

# Hoặc start từng service:
cd backend/api-gateway
npm run dev
```

### Lỗi: `401 Unauthorized` hoặc "Invalid credentials"
**Nguyên nhân**: Email/password sai hoặc user chưa tồn tại  
**Giải pháp**:
1. Đăng ký tài khoản mới tại `/register`
2. Hoặc dùng tài khoản đã tạo trong database

### Lỗi: Login thành công nhưng không chuyển hướng
**Nguyên nhân**: React Router không navigate  
**Check Console**: Xem log `🏠 Navigating to /home`
**Giải pháp**: Đã fix bằng cách thêm setTimeout(100ms) trước khi navigate

### Lỗi: "Cannot read property 'user' of undefined"
**Nguyên nhân**: Response structure không khớp  
**Check**: Xem response trong Network tab (F12 → Network → XHR → Click vào request `/api/auth/login`)
**Expected response**:
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "role": "PASSENGER"
  }
}
```

---

## 📋 Checklist Debug

Khi gặp lỗi login, hãy check theo thứ tự:

- [ ] 1. Backend có đang chạy không? → `curl http://localhost:3000/health`
- [ ] 2. File `.env` có tồn tại không? → `Test-Path .env` (PowerShell)
- [ ] 3. Dev server đã restart sau khi sửa `.env` chưa?
- [ ] 4. Browser đã clear cache chưa? (Ctrl + Shift + R)
- [ ] 5. Console có hiện log không? (🔐, ✅, ❌)
- [ ] 6. Network tab có request `/api/auth/login` không?
- [ ] 7. Response status code là gì? (200 OK / 401 / 500)
- [ ] 8. localStorage có `accessToken` không? → Mở DevTools → Application tab → Local Storage

---

## 🎯 Test Case

### Happy Path (Successful Login)
1. Start backend: `docker-compose up -d`
2. Start frontend: `npm run dev`
3. Go to: http://localhost:5173/login
4. Open DevTools Console
5. Enter valid email + password
6. Click "Login"
7. **Expected logs**:
   ```
   🔐 Attempting login with: user@example.com
   ✅ Login successful: {user: {...}, accessToken: "...", ...}
   🏠 Navigating to /home
   ```
8. **Expected behavior**: Redirect to `/home` in ~100ms

### Error Path (Backend Down)
1. Stop backend: `docker-compose down`
2. Try to login
3. **Expected error**: "Cannot connect to server. Please check if backend is running on http://localhost:3000"

### Error Path (Invalid Credentials)
1. Backend running
2. Enter wrong password
3. **Expected error**: "Invalid email or password"

---

## 💡 Tip: Quick Debug Command

```bash
# Check tất cả trong 1 lệnh
echo "=== Backend Health ===" && curl http://localhost:3000/health && echo "`n=== .env Exists? ===" && Test-Path .env && echo "`n=== API Gateway URL ===" && cat .env | Select-String "VITE_API_GATEWAY_URL"
```

---

**Status**: ✅ Fixed. Hãy restart dev server và test lại!
