# Frontend Payment Flow Testing Guide

## Quick Start

### Prerequisites
- Both frontend apps running (passenger-app dev server + driver-app dev server)
- Backend services running (booking, ride, payment services)
- Socket.io connection working

### Running Frontend Apps

```bash
# Terminal 1: Passenger App
cd frontend/web-app/passenger-app
npm run dev  # Should run on http://localhost:5174 (or similar)

# Terminal 2: Driver App
cd frontend/web-app/driver-app
npm run dev  # Should run on http://localhost:5175 (or similar)

# Terminal 3: Backend (if not already running)
cd backend
npm run dev
```

---

## Test Scenario 1: CASH Payment Flow

### Step 1: Passenger Creates Booking with CASH
1. **Open Passenger App**: Navigate to booking screen
2. **Select Payment**: Click **💵 Tiền mặt** button in RideOptions.jsx (should toggle to active state)
3. **Verify UI State**:
   - ✓ Button shows selected styling (e.g., border/highlight)
   - ✓ "Confirm" button shows payment method and fare
4. **Submit Booking**: Click "Confirm" button

**Expected Network Request**:
```json
POST /api/bookings
{
  "paymentMethod": "CASH",
  "vehicleType": "CAR",
  ...
}
```

### Step 2: Driver Accepts Ride
1. **Open Driver App**: Dashboard should show new ride
2. **Accept Ride**: Click accept button
3. **Verify**: Ride should show payment method = "CASH"

### Step 3: Complete Ride
1. **Passenger App**: Simulate ride completion (or use test API)
2. **Wait**: Both apps should receive `ride.completed` event
3. **Verify Navigation**:
   - ✓ Passenger app navigates to `/payment/{rideId}`
   - ✓ Driver app navigates to `/completed/{rideId}`

### Step 4: Passenger Sees Payment Status (CASH)
**File**: `Payment.jsx`

**Visual Checks**:
1. **Payment Method Display**:
   - ✓ Shows: 💵 **Thanh toán bằng tiền mặt**
   - ✓ Subtitle: "Thanh toán trực tiếp cho tài xế. Chờ tài xế xác nhận..."
   - ✓ Border color: Blue (UNPAID state)

2. **Button State**:
   - ✓ Button text: "Chờ tài xế xác nhận..."
   - ✓ Button DISABLED (gray out)
   - ✓ Cannot click

3. **Browser Console**:
   - ✓ Check polling is active: `console.log('Polling ride status...')`
   - ✓ Polling should hit `/api/rides/{rideId}` every 3 seconds

### Step 5: Driver Sees Confirm Button
**File**: `Completed.jsx`

**Visual Checks**:
1. **Status Badge**:
   - ✓ Shows: 🟠 **Chưa xác nhận** (orange badge)
   
2. **Cash Confirmation Button**:
   - ✓ Shows: **Xác nhận đã thu 50,000₫** (or actual amount)
   - ✓ Button ENABLED (green)
   - ✓ Can click

3. **Continue Button**:
   - ✓ Shows: **Tiếp tục nhận chuyến**
   - ✓ Button DISABLED (gray) - this is KEY for CASH flow
   - ✓ Tooltip: Waiting for cash confirmation

### Step 6: Driver Confirms Cash Payment
**File**: `Completed.jsx` → `handleConfirmCash()`

1. **Click Button**: Click "Xác nhận đã thu 50,000₫"
2. **Button State**:
   - ✓ Loading state: "Đang xử lý..."
   - ✓ Disabled temporarily

3. **Expected API Call**:
   ```
   PATCH /api/rides/{rideId}/confirm-cash-payment
   Content-Type: application/json
   {"driverId": "..."}
   ```

4. **Success Response**:
   - ✓ Toast notification: "Đã xác nhận thu tiền mặt"
   - ✓ Status badge changes to: 🟢 **Đã xác nhận**
   - ✓ "Tiếp tục nhận chuyến" button ENABLED (green)

### Step 7: Passenger Receives Confirmation
**File**: `Payment.jsx` → Socket listener or polling

**Expected Event**: `ride:paymentCompleted` or `ride.payment.cash-confirmed`

**Visual Update - IMMEDIATE or within 3 seconds**:
1. **Status Display**:
   - ✓ Icon changes to: ✓ **Tài xế đã xác nhận nhận tiền**
   - ✓ Border/background changes to green
   
2. **Button Update**:
   - ✓ Button text: **Đánh giá chuyến đi**
   - ✓ Button ENABLED (green)
   
3. **Auto-navigation** (optional):
   - After 1.5s, may auto-navigate to `/rating/{rideId}`
   - Or manual click "Đánh giá chuyến đi" button

4. **Toast Notification**:
   - ✓ Shows: "Tài xế đã xác nhận!"

**Browser Console Checks**:
- ✓ Socket event logged: `✓ Cash confirmed: {rideId, paymentStatus: 'PAID'}`

---

## Test Scenario 2: WALLET Payment Flow

### Step 1-2: Passenger Creates Booking with WALLET
Repeat Steps 1-2, but select **💰 Ví CabGo** instead of CASH

**Expected Network Request**:
```json
POST /api/bookings
{
  "paymentMethod": "WALLET",
  ...
}
```

### Step 3: Complete Ride
Same as CASH flow

### Step 4: Passenger Sees Payment Processing (WALLET)
**File**: `Payment.jsx`

**Visual Checks**:
1. **Payment Method Display**:
   - ✓ Shows: 💰 **Thanh toán qua Ví CabGo**
   - ✓ Subtitle: Shows animated spinner ⏳
   - ✓ Subtitle text: "Hệ thống đang xử lý thanh toán..."
   - ✓ Border color: Blue (PENDING state)

2. **Spinner Animation**:
   - ✓ Spinner rotates continuously
   - ✓ Color: Blue

3. **Button State**:
   - ✓ Button text: "Chờ thanh toán..."
   - ✓ Button DISABLED (gray)

### Step 5: Driver Sees Non-blocking State
**File**: `Completed.jsx`

**Visual Checks**:
1. **Status Badge**:
   - ✓ Shows: 🟡 **Đang xử lý ví...** (yellow badge)
   
2. **No Confirm Button**:
   - ✓ Cash confirmation button NOT shown (because paymentMethod !== 'CASH')
   
3. **Continue Button**:
   - ✓ Shows: **Tiếp tục nhận chuyến**
   - ✓ Button ENABLED (green) - **KEY DIFFERENCE from CASH**
   - ✓ Driver can click and continue accepting rides

### Step 6: Simulate Successful Wallet Payment
In payment service (backend), trigger payment success:

**Expected Event**: `ride:paymentCompleted` or `ride.payment.completed`

**Passenger App - Immediate Update**:
1. **Status Display**:
   - ✓ Spinner disappears
   - ✓ Shows: ✓ **Thanh toán thành công**
   - ✓ Border/background changes to green
   
2. **Button Update**:
   - ✓ Button text: **Đánh giá chuyến đi**
   - ✓ Button ENABLED
   
3. **Toast**:
   - ✓ Shows: "Thanh toán thành công!"

**Driver App - Receives update**:
1. **Status Badge**:
   - ✓ Changes to: 🟢 **Đã thanh toán**
   
2. **Toast**:
   - ✓ Shows: "Khách hàng đã thanh toán qua ví thành công!"

### Step 7: Test Wallet Failure Path (Optional)
In payment service, trigger payment failure:

**Expected Event**: `ride:paymentFailed` or `ride.payment.failed`

**Passenger App - Error State**:
1. **Status Display**:
   - ✓ Shows: ✗ **Thanh toán thất bại. Số dư ví có thể không đủ.**
   - ✓ Border/background changes to red
   
2. **Button Update**:
   - ✓ Button text: **Bỏ qua & Đánh giá**
   - ✓ Button ENABLED (red/orange)
   
3. **Toast**:
   - ✓ Shows: "Thanh toán thất bại. Vui lòng thử lại hoặc liên hệ CSKH."

**Driver App - Failure Notification**:
1. **Status Badge**:
   - ✓ Changes to: 🔴 **Thanh toán thất bại**
   - ✓ Background red
   
2. **Toast**:
   - ✓ Shows: "Thanh toán qua ví thất bại!"

---

## Test Scenario 3: Socket Event Failure (Polling Fallback)

### Setup: Simulate Socket Disconnection
1. **Open Browser DevTools**: F12
2. **Go to Network Tab**
3. **Right-click** on socket.io connection → **Block URL** (or throttle)
4. Alternative: Close WebSocket connection manually in console

### Expected Behavior - Payment.jsx
1. **Socket disconnects**
2. **Polling continues** (every 3 seconds):
   - ✓ Network tab shows: `GET /api/rides/{rideId}` every 3s
3. **Status updates within 3s** even without socket event
4. **Eventually reaches final state** (PAID, SUCCESS, or FAILED)

### Expected Behavior - Completed.jsx
1. **Socket disconnects**
2. **Polling continues** for PENDING state:
   - ✓ Network tab shows: `GET /api/rides/{rideId}` every 3s
3. **Status updates when payment completes**
4. **No socket toast, but data updates correctly**

### How to Verify Polling Working:
```javascript
// In browser console during test
// You should see these logs:
console.log('GET /api/rides/xxx'); // Every 3s if polling active
```

---

## Test Scenario 4: Manual Refresh Edge Cases

### Test 4a: Passenger Refreshes Payment Page During CASH Wait
1. Driver hasn't confirmed yet
2. **Passenger refreshes page**: F5
3. **Expected**:
   - ✓ Fetches latest ride status
   - ✓ Shows "Chờ tài xế xác nhận..." still
   - ✓ Button disabled
   - ✓ Polling resumes

### Test 4b: Driver Confirms, Then Passenger Refreshes
1. Driver confirmed payment
2. Passenger doesn't see socket event (somehow)
3. **Passenger refreshes page**: F5
4. **Expected**:
   - ✓ Fetches ride with `paymentStatus: 'PAID'`
   - ✓ Shows green: ✓ **Tài xế đã xác nhận nhận tiền**
   - ✓ Button enabled: **Đánh giá chuyến đi**

---

## Browser Console Debugging

### Enable Detailed Logging
Add this to browser console in Payment.jsx:

```javascript
// Listen for all socket events
socket.onAny((eventName, ...args) => {
    console.log(`📨 Socket Event: ${eventName}`, args);
});

// Log polling
setInterval(() => {
    console.log('📡 Polling ride status...');
}, 3000);
```

### Expected Console Output - CASH Flow
```
📡 Polling ride status...
GET /api/rides/ride_123 → {paymentStatus: 'UNPAID', paymentMethod: 'CASH'}
(wait for driver confirmation...)
📨 Socket Event: ride:paymentCompleted {rideId: 'ride_123', paymentStatus: 'PAID'}
✓ Cash confirmed: {rideId: 'ride_123', paymentStatus: 'PAID'}
```

### Expected Console Output - WALLET Flow
```
📡 Polling ride status...
GET /api/rides/ride_456 → {paymentStatus: 'PENDING', paymentMethod: 'WALLET'}
(wallet processing...)
📨 Socket Event: ride:paymentCompleted {rideId: 'ride_456', paymentStatus: 'SUCCESS'}
✓ Payment completed: {rideId: 'ride_456', paymentStatus: 'SUCCESS'}
```

---

## Checklist: All Tests Must Pass

- [ ] **CASH Flow**:
  - [ ] Booking accepts CASH method
  - [ ] Ride copies paymentMethod
  - [ ] Ride completion sets status to UNPAID
  - [ ] Payment.jsx shows "Chờ tài xế xác nhận..." (disabled)
  - [ ] Completed.jsx shows confirm button (enabled)
  - [ ] Driver confirms cash
  - [ ] Payment.jsx updates to "✓ Tài xế đã xác nhận" (enabled) within 3s
  - [ ] Completed.jsx updates to "Đã xác nhận" (green badge)
  - [ ] Passenger can navigate to rating

- [ ] **WALLET Flow**:
  - [ ] Booking accepts WALLET method
  - [ ] Ride copies paymentMethod
  - [ ] Ride completion sets status to PENDING
  - [ ] Payment.jsx shows spinner (disabled)
  - [ ] Completed.jsx shows "Đang xử lý ví..." (no confirm button)
  - [ ] Completed.jsx continue button ENABLED (non-blocking)
  - [ ] Payment succeeds via backend
  - [ ] Payment.jsx updates to "✓ Thanh toán thành công" (enabled) within 10s
  - [ ] Completed.jsx updates to "Đã thanh toán" (green badge)

- [ ] **Failure Paths**:
  - [ ] WALLET failure shows error state in both apps
  - [ ] Passenger can skip to rating
  - [ ] Driver continues normally

- [ ] **Socket Fallback**:
  - [ ] Polling occurs every 3 seconds
  - [ ] Status updates without socket events
  - [ ] Error handling graceful

- [ ] **Edge Cases**:
  - [ ] Manual refresh works correctly
  - [ ] Multiple passengers/drivers don't interfere
  - [ ] No console errors

---

## Performance Notes

### Expected Load Times
- Payment.jsx initial load: < 500ms
- Completed.jsx initial load: < 500ms
- Socket event propagation: < 100ms
- Polling request: < 200ms

### Memory Usage
- Should not have memory leaks from event listeners
- Socket listeners cleaned up on unmount
- Polling intervals cleared on unmount

---

## Support & Debugging

**If Tests Fail**:
1. Check browser console for errors
2. Check Network tab for failed API calls
3. Verify backend services are running
4. Check Socket.io connection status in DevTools
5. Ensure `VITE_API_URL` environment variable is correct

**Common Issues**:

| Issue | Solution |
|-------|----------|
| Button stays disabled forever | Check backend is processing payment, or check socket connection |
| Polling not happening | Check if `ride.paymentStatus` is PENDING or UNPAID |
| Socket events not received | Check backend is broadcasting events, or verify socket namespace |
| WALLET button disabled on driver | Check `paymentMethod === 'CASH'` - should not be true for WALLET |
| Toast notifications not showing | Verify react-hot-toast is properly initialized |

---

**Last Updated**: [Current Date]
**Frontend Status**: ✅ Ready for QA Testing
