# Payment Flow - CabGo System

## Overview
Standardized payment flow for ride-sharing platform (CabGo) supporting CASH and WALLET payment methods.

---

## 1. Booking Creation (Passenger)

### Endpoint
```
POST /api/bookings
```

### Request Payload
```json
{
  "pickup": {
    "lat": 10.7769,
    "lng": 106.6966,
    "address": "123 Nguyen Hue, Ho Chi Minh"
  },
  "dropoff": {
    "lat": 10.7890,
    "lng": 106.7050,
    "address": "456 Dong Khoi, Ho Chi Minh"
  },
  "vehicleType": "CAR",
  "estimatedPrice": 150000,
  "paymentMethod": "WALLET"  // REQUIRED: CASH | WALLET
}
```

### Key Actions
1. **Booking Service** saves booking with:
   - ✅ `paymentMethod` (CASH or WALLET)
   - ✅ `paymentStatus` (default: UNPAID)
   - ✅ `status` (PENDING)

2. **Publish Event**: `booking.created`
   - Includes paymentMethod in event payload

3. **Sequential Driver Matching** starts

### Response
```json
{
  "success": true,
  "data": {
    "_id": "booking-123",
    "passengerId": "user-456",
    "paymentMethod": "WALLET",
    "paymentStatus": "UNPAID",
    "status": "PENDING",
    "...": "..."
  }
}
```

---

## 2. Driver Acceptance

### When Driver Accepts
1. **Booking Service** updates:
   - `status` → MATCHED
   - `assignedDriverId` → driver's ID
   - `paymentMethod` remains unchanged ✅

2. **Publish Event**: `booking.matched`
   - Notifies passenger of driver assignment

3. **Frontend** calls **Ride Service** to create ride

---

## 3. Ride Creation

### Endpoint
```
POST /api/rides
```

### Request Payload
```json
{
  "bookingId": "booking-123",
  "passengerId": "user-456",
  "driverId": "driver-789",
  "pickup": { "lat": 10.7769, "lng": 106.6966, "address": "..." },
  "dropoff": { "lat": 10.7890, "lng": 106.7050, "address": "..." },
  "route": {
    "distanceKm": 2.5,
    "durationMin": 8,
    "polyline": [...]
  },
  "paymentMethod": "WALLET"  // OPTIONAL: Falls back to booking's paymentMethod
}
```

### Key Actions (Ride Service)
1. **Create Ride** with:
   - ✅ Copy `paymentMethod` from booking (if not provided in request)
   - ✅ Set `paymentStatus` → UNPAID (default)
   - ✅ Store locations, routes
   - ✅ Status → ASSIGNED (if driverId provided)

2. **Publish Event**: `ride.assigned` or `ride.created`

### Response
```json
{
  "success": true,
  "data": {
    "_id": "ride-123",
    "bookingId": "booking-123",
    "passengerId": "user-456",
    "driverId": "driver-789",
    "paymentMethod": "WALLET",
    "paymentStatus": "UNPAID",
    "status": "ASSIGNED",
    "...": "..."
  }
}
```

---

## 4. Ride in Progress

### Endpoints
- `PATCH /api/rides/:id/start` - Driver starts trip
- `PATCH /api/rides/:id/arrive` - Driver arrives at pickup

### Constraints
- ❌ **Cannot change** `paymentMethod` after ride starts
- ✅ `paymentStatus` remains in current state

---

## 5. Ride Completion

### Endpoint
```
PATCH /api/rides/:id/complete
```

### Request Payload
```json
{
  "actualDistanceKm": 2.3,
  "actualDurationMin": 7,
  "driverLocation": {
    "lat": 10.7890,
    "lng": 106.7050
  }
}
```

### Validation
- ✅ Ride status must be `STARTED`
- ⚠️ **CRITICAL**: Driver must be within **100 meters** of dropoff
- ✅ Calculate `finalFare` via pricing service

### Actions (Ride Service)

#### 5.1 Update Ride Status
```
ride.status → COMPLETED
actualDistanceKm, actualDurationMin, finalFare → saved
```

#### 5.2 Set Payment Status Based on Method

**If paymentMethod = CASH:**
```
ride.paymentStatus → UNPAID (driver hasn't confirmed receipt yet)
```

**If paymentMethod = WALLET:**
```
ride.paymentStatus → PENDING (payment processing in progress)
```

#### 5.3 Publish Events

**Always Publish**: `ride.completed`
```json
{
  "eventId": "1234567890-completed",
  "type": "RideCompleted",
  "rideId": "ride-123",
  "bookingId": "booking-123",
  "driverId": "driver-789",
  "userId": "user-456",
  "actualDistanceKm": 2.3,
  "actualDurationMin": 7,
  "finalFare": 145000,
  "paymentMethod": "WALLET",
  "paymentStatus": "PENDING",
  "timestamp": "2025-02-22T10:30:00Z"
}
```

**If paymentMethod = WALLET**: `ride.payment.process`
```json
{
  "rideId": "ride-123",
  "bookingId": "booking-123",
  "passengerId": "user-456",
  "driverId": "driver-789",
  "amount": 145000,
  "method": "WALLET",
  "timestamp": "2025-02-22T10:30:00Z"
}
```

---

## 6. Payment Processing

### A. CASH Payment Flow

#### Step 6A.1: After Ride Completion
- Payment Service shows empty record (no payment processing)
- Driver's UI shows "Awaiting Cash Collection"
- Passenger's UI shows "Payment Method: CASH - Awaiting Confirmation"

#### Step 6A.2: Driver Confirms Cash Receipt

**Endpoint**
```
PATCH /api/rides/:id/confirm-cash-payment
```

**Request**
```json
{} // No body needed, driver identity from auth header
```

**Action**
- Ride Service updates: `ride.paymentStatus → PAID`
- Publish Event: `ride.payment.completed`

**Event Payload**
```json
{
  "eventId": "1234567890-payment-completed",
  "type": "PaymentCompleted",
  "rideId": "ride-123",
  "bookingId": "booking-123",
  "driverId": "driver-789",
  "userId": "user-456",
  "paymentMethod": "CASH",
  "paymentStatus": "PAID",
  "finalFare": 145000,
  "timestamp": "2025-02-22T10:31:00Z"
}
```

---

### B. WALLET Payment Flow

#### Step 6B.1: Ride Completed
- Ride Service publishes `ride.payment.process`
- Payment Service receives event

#### Step 6B.2: Payment Service Processing

1. **Idempotency Check**
   - Check if payment already exists for `ride_id`
   - If exists → skip (prevents duplicate charging)
   - ✅ Database constraint: `UNIQUE(ride_id)`

2. **Create Payment**
   ```
   payment.status → PENDING
   payment.ride_id → ride-123
   payment.passenger_id → user-456
   payment.amount → 145000
   payment.method → WALLET
   ```

3. **Process Charge**
   - Call wallet/payment gateway adapter
   - Retry logic: max 3 attempts with exponential backoff

4. **On Success**
   - Update: `payment.status → SUCCESS`
   - Publish: `ride.payment.completed`

5. **On Failure**
   - Update: `payment.status → FAILED`
   - Publish: `ride.payment.failed`
   - Passenger can retry manually

#### Step 6B.3: Booking Service Handles Events
- `ride.payment.completed` → Update booking status
- `ride.payment.failed` → Allow retry or rematching

---

## 7. User Interface Display

### Passenger View - After Ride Completion

**CASH Payment**
```
Payment Method: CASH (from booking)
Payment Status: Awaiting Driver Confirmation
Transaction: Pending
Amount: 145,000 VND
```
↓ (After driver confirms)
```
Payment Method: CASH
Payment Status: Paid
Transaction: Completed
Amount: 145,000 VND
```

**WALLET Payment**
```
Payment Method: WALLET (from booking)
Payment Status: Processing...
Transaction: In Progress
Amount: 145,000 VND
```
↓ (After payment success)
```
Payment Method: WALLET
Payment Status: Paid
Transaction: Completed
Amount: 145,000 VND
Wallet Balance: 855,000 VND (after deduction)
```

---

## 8. Data Models

### Booking Model
```javascript
{
  paymentMethod: { type: String, enum: ['CASH', 'WALLET'], default: 'CASH' },
  paymentStatus: { type: String, enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED'], default: 'UNPAID' },
  // ...
}
```

### Ride Model
```javascript
{
  paymentMethod: { type: String, enum: ['CASH', 'WALLET'], default: 'CASH' },
  paymentStatus: { type: String, enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED'], default: 'UNPAID' },
  actualDistanceKm: Number,
  actualDurationMin: Number,
  finalFare: Number,
  // ...
}
```

### Payment Model (PostgreSQL)
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  ride_id VARCHAR UNIQUE NOT NULL,     -- UNIQUE for idempotency
  passenger_id VARCHAR NOT NULL,
  driver_id VARCHAR,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20),           -- CASH, WALLET
  status VARCHAR(20),                   -- PENDING, SUCCESS, FAILED
  saga_status VARCHAR(50),              -- State machine tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(ride_id),
  INDEX(passenger_id)
);
```

---

## 9. Event Naming Convention

All payment-related events follow the `ride.*` namespace:

| Event | Origin | Purpose |
|-------|--------|---------|
| `ride.completed` | Ride Service | Ride finished, payment processing starts |
| `ride.payment.process` | Ride Service | Trigger wallet payment processing |
| `ride.payment.completed` | Payment Service | Payment successful |
| `ride.payment.failed` | Payment Service | Payment failed (allow retry) |
| `ride.payment.retry` | Payment Service | Payment retry attempt |

---

## 10. Integration Checklist

- [x] Booking model has `paymentMethod`
- [x] Ride model has `paymentMethod` and `paymentStatus`
- [x] Ride service copies `paymentMethod` from booking
- [x] Distance validation set to 100m maximum
- [x] Payment status logic in `completeRide()`
- [x] `confirmCashPayment` endpoint implemented
- [x] Payment service has idempotency (unique ride_id)
- [x] Events follow `ride.*` naming
- [x] Frontend sends `paymentMethod` when creating booking
- [x] Frontend displays correct payment method and status

---

## 11. Common Issues & Fixes

### Issue: "CASH Payment Shows as WALLET"
**Cause**: Frontend didn't send `paymentMethod` when creating booking
**Fix**: Ensure booking creation request includes:
```json
{
  "paymentMethod": "CASH"  // Required
}
```

### Issue: "Payment Status Never Updates"
**Cause**: Ride service not publishing payment events correctly
**Fix**: Verify `ride.completed` event includes `paymentMethod` and `paymentStatus`

### Issue: "WALLET Charged Multiple Times"
**Cause**: Payment idempotency not working
**Fix**: Verify database constraint on `payments(ride_id)` is UNIQUE

### Issue: "Driver Can't Confirm Cash Payment"
**Cause**: Driver calls endpoint but ride not in COMPLETED state
**Fix**: Ensure ride status is fully updated before driver UI allows confirmation button

---

## 12. Testing Scenarios

### Test 1: CASH Flow
1. Create booking with `paymentMethod: "CASH"`
2. Driver accepts
3. Complete ride
4. Verify `paymentStatus: "UNPAID"`
5. Driver confirms cash payment
6. Verify `paymentStatus: "PAID"` and event `ride.payment.completed` published

### Test 2: WALLET Flow
1. Create booking with `paymentMethod: "WALLET"`
2. Driver accepts
3. Complete ride
4. Verify `paymentStatus: "PENDING"`
5. Verify event `ride.payment.process` published
6. Payment service processes charge
7. Verify `ride.payment.completed` event published
8. Verify passenger's wallet debited

### Test 3: Idempotency
1. Complete ride with WALLET payment
2. Simulate duplicate `ride.payment.process` event
3. Verify payment is only charged once

