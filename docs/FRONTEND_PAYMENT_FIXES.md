# Frontend Payment Flow Fixes

## Overview
Updated frontend components to align with standardized backend payment flow. Both passenger and driver apps now properly handle CASH and WALLET payment methods with correct status displays and socket event handling.

## Files Modified

### 1. Passenger App - `frontend/web-app/passenger-app/src/pages/Payment.jsx`
**Purpose**: Display payment status after ride completion, handle both CASH and WALLET payment methods

**Key Changes**:
- ✅ Socket event listeners for payment completion/failure:
  - `ride.payment.completed` → WALLET success
  - `ride.payment.failed` → WALLET failure  
  - `ride.payment.cash-confirmed` → Driver confirmed CASH
  - Backward compat aliases: `ride:paymentCompleted`, `ride:paymentFailed`

- ✅ Polling fallback (3s interval) to ensure payment status updates even if socket fails

- ✅ Conditional display based on method and status:
  - **CASH + PAID**: Shows "✓ Tài xế đã xác nhận nhận tiền"
  - **CASH + UNPAID**: Shows "Thanh toán trực tiếp cho tài xế. Chờ tài xế xác nhận..."
  - **WALLET + PENDING**: Shows spinner "Hệ thống đang xử lý thanh toán..."
  - **WALLET + SUCCESS**: Shows "✓ Thanh toán thành công"
  - **WALLET + FAILED**: Shows "✗ Thanh toán thất bại..."

- ✅ Button logic:
  - **Disabled** if payment not complete AND status is not FAILED
  - **Enabled** for: CASH (can skip), WALLET FAILED (retry/skip), or payment complete

### 2. Passenger App - `frontend/web-app/passenger-app/src/pages/RideTracking.jsx`
**Status**: ✅ Currently working correctly
- Already routes to `/payment/{rideId}` when ride.completed event fires
- No changes needed

### 3. Driver App - `frontend/web-app/driver-app/src/pages/Completed.jsx`
**Purpose**: Show driver post-ride earnings, payment status, and confirmation options

**Key Changes**:
- ✅ Updated status indicator displays for all payment states:
  - **PAID**: Green "Đã xác nhận" (CASH payment confirmed)
  - **SUCCESS**: Green "Đã thanh toán" (WALLET payment success)
  - **PENDING**: Yellow "Đang xử lý ví..." (WALLET payment processing)
  - **FAILED**: Red "Thanh toán thất bại" (WALLET payment failed)
  - **UNPAID**: Orange "Chưa xác nhận" (CASH awaiting confirmation)

- ✅ Socket event listeners for all payment outcomes:
  - Listens for payment completion/failure from payment-service
  - Listens for cash confirmation from payment endpoint
  - Updates ride status immediately on socket events

- ✅ Polling fallback (3s interval) for PENDING/UNPAID states to catch payment updates

- ✅ Button logic fixes:
  - **Cash confirmation button**: Shows only when `paymentMethod === 'CASH' && paymentStatus !== 'PAID'`
  - **"Tiếp tục nhận chuyến" button**: Now ONLY disabled when `paymentMethod === 'CASH' && paymentStatus === 'UNPAID'`
    - This allows drivers to continue when WALLET payment is PENDING (non-blocking)
    - Only waits for CASH confirmation, not WALLET processing

## Payment Flow State Diagram

```
Passenger-side:
  Booking (select CASH/WALLET)
    ↓
  Ride Created (paymentMethod copied)
    ↓
  Ride Completed (paymentStatus: CASH→UNPAID, WALLET→PENDING)
    ↓
  Payment.jsx
    ├─ CASH + UNPAID → Wait for driver confirmation
    │   ├─ Socket: ride:paymentCompleted → Navigate to rating
    │   └─ Button: Can skip anytime
    │
    └─ WALLET + PENDING → Processing payment
        ├─ Success → Socket: ride:paymentCompleted → Navigate to rating
        ├─ Failure → Socket: ride:paymentFailed → Show error, allow retry
        └─ Polling: Checks every 3s as backup

Driver-side:
  Completed.jsx (after ride completes)
    ├─ CASH: Show confirm button
    │   └─ Click → PATCH /api/rides/{id}/confirm-cash-payment
    │       └─ Socket: ride:paymentCompleted → Update to PAID
    │
    └─ WALLET:
        ├─ PENDING: Show spinner, allow continue (non-blocking)
        │   └─ Socket: ride:paymentCompleted → Update to SUCCESS
        ├─ SUCCESS: Show "Đã thanh toán", enable continue
        └─ FAILED: Show error, allow continue
```

## Testing Checklist

### CASH Payment Flow ✓
- [ ] **Booking**:
  1. Passenger selects "💵 Tiền mặt" in RideOptions.jsx
  2. Booking sent with `paymentMethod: "CASH"`

- [ ] **Payment Page**:
  1. After ride completes, navigate to Payment.jsx
  2. Shows: "Thanh toán bằng tiền mặt" with message waiting for driver
  3. Button disabled: "Chờ tài xế xác nhận..."

- [ ] **Driver Confirmation**:
  1. Driver sees Completed.jsx
  2. Shows: Status "Chưa xác nhận" in orange
  3. Green button: "Xác nhận đã thu 50,000₫"
  4. "Tiếp tục nhận chuyến" button DISABLED until confirmed

- [ ] **After Confirmation**:
  1. Driver clicks confirm button
  2. API call: `PATCH /api/rides/{rideId}/confirm-cash-payment`
  3. Socket updates both driver and passenger
  4. Driver: Status changes to "Đã xác nhận" (green), button enables
  5. Passenger: Receives `ride:paymentCompleted`, navigates to rating

### WALLET Payment Flow ✓
- [ ] **Booking**:
  1. Passenger selects "💰 Ví CabGo" in RideOptions.jsx
  2. Booking sent with `paymentMethod: "WALLET"`

- [ ] **Payment Page**:
  1. After ride completes, navigate to Payment.jsx
  2. Shows: "Thanh toán qua Ví CabGo" with spinner "Hệ thống đang xử lý..."
  3. Button disabled: "Chờ thanh toán..."

- [ ] **Wallet Processing (PENDING)**:
  1. Driver sees Completed.jsx
  2. Shows: Status "Đang xử lý ví..." in yellow
  3. No confirm button (wallet auto-processes)
  4. "Tiếp tục nhận chuyến" button ENABLED (non-blocking)

- [ ] **Success Path**:
  1. Payment service processes payment
  2. Socket: `ride.payment.completed` → Payment.jsx receives it (10s polling fallback)
  3. Passenger status changes to "✓ Thanh toán thành công" (green)
  4. Button enables: "Đánh giá chuyến đi"
  5. Driver status changes to "Đã thanh toán" (green)

- [ ] **Failure Path**:
  1. Payment insufficient balance
  2. Socket: `ride.payment.failed` → Payment.jsx receives it
  3. Passenger shows: "✗ Thanh toán thất bại..." (red)
  4. Button enables: "Bỏ qua & Đánh giá"
  5. Driver shows: "Thanh toán thất bại" (red)

## Socket Events Expected

**From Payment Service**:
- `ride.payment.completed` - Wallet payment succeeded
- `ride.payment.failed` - Wallet payment failed
- `ride.payment.cash-confirmed` - Driver confirmed cash

**From Ride Service**:
- `ride.completed` - Ride ended (triggers navigation to payment page)

**Backward Compatibility**:
- `ride:paymentCompleted` (instead of `ride.payment.completed`)
- `ride:paymentFailed` (instead of `ride.payment.failed`)
- Both event names are listened for in frontend

## API Endpoints Used

**From Payment.jsx**:
- `GET /api/rides/{rideId}` - Fetch current ride/payment status
- Socket port: (from socketService configuration)

**From Completed.jsx**:
- `GET /api/rides/{rideId}` - Fetch ride status (for polling)
- `PATCH /api/rides/{rideId}/confirm-cash-payment` - Confirm cash payment

## Environment Setup
No new environment variables needed. All configurations inherited from:
- `frontend/web-app/.env` - Contains `VITE_API_URL`
- Socket service auto-connects to API gateway

## Recovery & Error Handling

1. **Socket Failure**:
   - Polling mechanism kicks in every 3 seconds
   - Ensures status updates even if real-time connection fails
   - No data loss, just delayed updates

2. **Payment Stuck in PENDING**:
   - Driver can continue with "Tiếp tục nhận chuyến" button (non-blocking)
   - Passenger can skip to rating with "Bỏ qua & Đánh giá"
   - Polling ensures eventual consistency

3. **Manual Refresh** (if user closes and reopens app):
   - `fetchRide()` in Payment.jsx automatically fetches latest status
   - `initialRide` fallback in Completed.jsx
   - Polling updates status if changed

## Cross-Service Communication

```
Payment Service (port 3008)
    ↓ Publishes on ride.payment.completed/failed
    ↓
RabbitMQ Event Bus
    ↓ Consumed by event bridge
    ↓
Socket.io (to connected clients)
    ↓
Frontend (Payment.jsx, Completed.jsx)
```

All events now use standardized `ride.*` namespace for consistency.

## Deployment Notes

✅ **No database migrations needed**
✅ **No new dependencies added**
✅ **No backend changes required** (already done in separate task)
✅ **Drop-in replacement** - just update frontend files

---

**Status**: ✅ Ready for testing
**Updated**: [Current Date]
**Backward Compatible**: Yes (supports both `ride:paymentX` and `ride.payment.x` event names)
