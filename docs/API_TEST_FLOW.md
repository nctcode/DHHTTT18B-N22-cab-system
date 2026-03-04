# API Testing Flow - CAB Booking System

## Complete Test Flow with Data

### Prerequisites
- All services running via docker-compose
- Postman or curl installed
- Base URL: `http://localhost:3000`

---

## 🔐 Phase 1: Authentication & User Management

### 1.1 Register Customer

**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "email": "customer1@example.com",
  "password": "Customer@123",
  "fullName": "Nguyen Van A",
  "phone": "+84901234567",
  "role": "customer"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "email": "customer1@example.com",
    "fullName": "Nguyen Van A",
    "role": "customer"
  }
}
```

---

### 1.2 Register Driver

**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "email": "driver1@example.com",
  "password": "Driver@123",
  "fullName": "Tran Van B",
  "phone": "+84907654321",
  "role": "driver",
  "licenseNumber": "DL123456789",
  "vehicleType": "sedan",
  "vehiclePlate": "29A-12345"
}
```

---

### 1.3 Login Customer

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "customer1@example.com",
  "password": "Customer@123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "15m",
  "user": {
    "id": "customer-uuid",
    "email": "customer1@example.com",
    "fullName": "Nguyen Van A",
    "role": "customer"
  }
}
```

**💾 Save for later:**
- `CUSTOMER_ACCESS_TOKEN`
- `CUSTOMER_REFRESH_TOKEN`
- `CUSTOMER_ID`

---

### 1.4 Login Driver

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "driver1@example.com",
  "password": "Driver@123"
}
```

**💾 Save:**
- `DRIVER_ACCESS_TOKEN`
- `DRIVER_ID`

---

### 1.5 Test Token Refresh

**Endpoint:** `POST /api/auth/refresh`

**Headers:**
```
Authorization: Bearer {CUSTOMER_REFRESH_TOKEN}
```

**Expected Response:**
```json
{
  "success": true,
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": "15m"
}
```

---

### 1.6 Get User Profile

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer {CUSTOMER_ACCESS_TOKEN}
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "customer-uuid",
    "email": "customer1@example.com",
    "fullName": "Nguyen Van A",
    "phone": "+84901234567",
    "role": "customer"
  }
}
```

---

## 🚗 Phase 2: Driver Management

### 2.1 Driver Update Location

**Endpoint:** `PUT /api/drivers/location`

**Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
```

**Request:**
```json
{
  "latitude": 21.0285,
  "longitude": 105.8542,
  "heading": 90,
  "speed": 45
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "location": {
    "latitude": 21.0285,
    "longitude": 105.8542,
    "updatedAt": "2026-02-10T01:30:00Z"
  }
}
```

---

### 2.2 Driver Set Available

**Endpoint:** `PATCH /api/drivers/status`

**Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
```

**Request:**
```json
{
  "status": "available"
}
```

---

### 2.3 Get Nearby Drivers (Customer)

**Endpoint:** `GET /api/drivers/nearby?lat=21.0285&lng=105.8542&radius=5000`

**Headers:**
```
Authorization: Bearer {CUSTOMER_ACCESS_TOKEN}
```

**Expected Response:**
```json
{
  "success": true,
  "drivers": [
    {
      "id": "driver-uuid",
      "fullName": "Tran Van B",
      "vehicleType": "sedan",
      "vehiclePlate": "29A-12345",
      "rating": 4.8,
      "distance": 1200,
      "location": {
        "latitude": 21.0285,
        "longitude": 105.8542
      }
    }
  ],
  "total": 1
}
```

---

## 💰 Phase 3: Pricing & Booking

### 3.1 Estimate Price

**Endpoint:** `POST /api/pricing/estimate`

**Headers:**
```
Authorization: Bearer {CUSTOMER_ACCESS_TOKEN}
```

**Request:**
```json
{
  "pickupLocation": {
    "latitude": 21.0285,
    "longitude": 105.8542,
    "address": "Hanoi Station"
  },
  "dropoffLocation": {
    "latitude": 21.0367,
    "longitude": 105.8345,
    "address": "Hoan Kiem Lake"
  },
  "vehicleType": "sedan"
}
```

**Expected Response:**
```json
{
  "success": true,
  "estimate": {
    "baseFare": 15000,
    "distanceFare": 35000,
    "timeFare": 10000,
    "surcharge": 5000,
    "total": 65000,
    "currency": "VND",
    "distance": 7.5,
    "estimatedDuration": 20
  }
}
```

**💾 Save:**
- `ESTIMATED_PRICE`

---

### 3.2 Create Booking

**Endpoint:** `POST /api/bookings`

**Headers:**
```
Authorization: Bearer {CUSTOMER_ACCESS_TOKEN}
```

**Request:**
```json
{
  "pickupLocation": {
    "latitude": 21.0285,
    "longitude": 105.8542,
    "address": "Hanoi Station"
  },
  "dropoffLocation": {
    "latitude": 21.0367,
    "longitude": 105.8345,
    "address": "Hoan Kiem Lake"
  },
  "vehicleType": "sedan",
  "estimatedPrice": 65000,
  "paymentMethod": "cash",
  "notes": "Please arrive on time"
}
```

**Expected Response:**
```json
{
  "success": true,
  "booking": {
    "id": "booking-uuid",
    "customerId": "customer-uuid",
    "status": "pending",
    "pickupLocation": {
      "latitude": 21.0285,
      "longitude": 105.8542,
      "address": "Hanoi Station"
    },
    "dropoffLocation": {
      "latitude": 21.0367,
      "longitude": 105.8345,
      "address": "Hoan Kiem Lake"
    },
    "vehicleType": "sedan",
    "estimatedPrice": 65000,
    "createdAt": "2026-02-10T01:35:00Z"
  }
}
```

**💾 Save:**
- `BOOKING_ID`

---

### 3.3 Get Booking Details

**Endpoint:** `GET /api/bookings/{BOOKING_ID}`

**Headers:**
```
Authorization: Bearer {CUSTOMER_ACCESS_TOKEN}
```

---

## 🚕 Phase 4: Ride Matching & Execution

### 4.1 Driver Accept Ride

**Endpoint:** `POST /api/rides/{RIDE_ID}/accept`

**Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
```

**Expected Response:**
```json
{
  "success": true,
  "ride": {
    "id": "ride-uuid",
    "bookingId": "booking-uuid",
    "driverId": "driver-uuid",
    "status": "accepted",
    "acceptedAt": "2026-02-10T01:36:00Z"
  }
}
```

**💾 Save:**
- `RIDE_ID`

---

### 4.2 Driver Start Ride

**Endpoint:** `PATCH /api/rides/{RIDE_ID}/start`

**Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
```

**Request:**
```json
{
  "otp": "1234"
}
```

---

### 4.3 Update Ride Route (During Trip)

**Endpoint:** `PUT /api/rides/{RIDE_ID}/location`

**Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
```

**Request:**
```json
{
  "latitude": 21.0300,
  "longitude": 105.8450
}
```

---

### 4.4 Complete Ride

**Endpoint:** `PATCH /api/rides/{RIDE_ID}/complete`

**Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
```

**Request:**
```json
{
  "finalLocation": {
    "latitude": 21.0367,
    "longitude": 105.8345
  },
  "actualDistance": 7.8,
  "actualDuration": 22
}
```

**Expected Response:**
```json
{
  "success": true,
  "ride": {
    "id": "ride-uuid",
    "status": "completed",
    "finalPrice": 68000,
    "completedAt": "2026-02-10T01:50:00Z"
  }
}
```

---

## 💳 Phase 5: Payment

### 5.1 Create Payment

**Endpoint:** `POST /api/payments`

**Headers:**
```
Authorization: Bearer {CUSTOMER_ACCESS_TOKEN}
```

**Request:**
```json
{
  "rideId": "ride-uuid",
  "amount": 68000,
  "method": "cash",
  "currency": "VND"
}
```

**Expected Response:**
```json
{
  "success": true,
  "payment": {
    "id": "payment-uuid",
    "rideId": "ride-uuid",
    "amount": 68000,
    "method": "cash",
    "status": "completed",
    "createdAt": "2026-02-10T01:51:00Z"
  }
}
```

**💾 Save:**
- `PAYMENT_ID`

---

### 5.2 Get Payment Details

**Endpoint:** `GET /api/payments/{PAYMENT_ID}`

**Headers:**
```
Authorization: Bearer {CUSTOMER_ACCESS_TOKEN}
```

---

## ⭐ Phase 6: Review & Rating

### 6.1 Customer Review Driver

**Endpoint:** `POST /api/reviews`

**Headers:**
```
Authorization: Bearer {CUSTOMER_ACCESS_TOKEN}
```

**Request:**
```json
{
  "rideId": "ride-uuid",
  "rating": 5,
  "comment": "Great driver, very professional!",
  "tags": ["friendly", "safe", "on-time"]
}
```

**Expected Response:**
```json
{
  "success": true,
  "review": {
    "id": "review-uuid",
    "rideId": "ride-uuid",
    "customerId": "customer-uuid",
    "driverId": "driver-uuid",
    "rating": 5,
    "comment": "Great driver, very professional!",
    "createdAt": "2026-02-10T01:52:00Z"
  }
}
```

---

### 6.2 Get Driver Reviews

**Endpoint:** `GET /api/reviews/driver/{DRIVER_ID}`

**Headers:**
```
Authorization: Bearer {CUSTOMER_ACCESS_TOKEN}
```

---

## 🔒 Phase 7: Security Features Testing

### 7.1 Test Token Revocation

**Endpoint:** `POST /api/auth/revoke`

**Headers:**
```
Authorization: Bearer {CUSTOMER_ACCESS_TOKEN}
```

**Request:**
```json
{
  "token": "{CUSTOMER_ACCESS_TOKEN}",
  "type": "access"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Token revoked successfully"
}
```

---

### 7.2 Try Using Revoked Token

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer {REVOKED_TOKEN}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Token has been revoked. Please login again.",
  "code": "TOKEN_REVOKED"
}
```

---

### 7.3 Logout All Devices

**Endpoint:** `POST /api/auth/logout-all`

**Headers:**
```
Authorization: Bearer {CUSTOMER_ACCESS_TOKEN}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

---

## 🛡️ Phase 8: Resilience Testing

### 8.1 Test Circuit Breaker

**Simulate service down:**
```powershell
docker stop cab-booking-user-service
```

**Test fallback:**
```
GET /api/users/{USER_ID}
```

**Expected Response:**
```json
{
  "data": {
    "id": "user-uuid",
    "name": "User",
    "email": null,
    "degraded": true
  },
  "source": "fallback",
  "warning": "User service temporarily unavailable"
}
```

---

### 8.2 Check Circuit Breaker Metrics

**Endpoint:** `GET /metrics/circuit-breakers`

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "2026-02-10T02:00:00Z",
  "circuitBreakers": {
    "user-service": {
      "state": "OPEN",
      "failures": 10,
      "successes": 0,
      "errorRate": 1.0,
      "latency": {
        "mean": 3000,
        "p95": 3500,
        "p99": 4000
      }
    },
    "booking-service": {
      "state": "CLOSED",
      "failures": 0,
      "successes": 150,
      "errorRate": 0.0
    }
  }
}
```

---

## 📊 Phase 9: Health Checks

### 9.1 Liveness Probe

**Endpoint:** `GET /health/live`

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-10T02:01:00Z",
  "checks": {
    "process": {
      "status": "healthy",
      "uptime": "3600s",
      "pid": 1234
    },
    "memory": {
      "status": "healthy",
      "heapUsedPercent": "45.23%"
    }
  }
}
```

---

### 9.2 Readiness Probe

**Endpoint:** `GET /health/ready`

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-10T02:01:00Z",
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database connection OK"
    },
    "redis": {
      "status": "healthy",
      "message": "Redis connection OK"
    },
    "rabbitmq": {
      "status": "healthy",
      "message": "RabbitMQ connection OK"
    },
    "circuitBreakers": {
      "status": "degraded",
      "message": "Some circuit breakers are OPEN"
    }
  }
}
```

---

## 📝 Complete Test Sequence

```bash
# 1. Register & Login
POST /api/auth/register (Customer)
POST /api/auth/register (Driver)
POST /api/auth/login (Customer) → Save ACCESS_TOKEN
POST /api/auth/login (Driver) → Save DRIVER_TOKEN

# 2. Setup
PUT /api/drivers/location (Driver)
PATCH /api/drivers/status (Driver - set available)

# 3. Book Ride
GET /api/drivers/nearby (Customer)
POST /api/pricing/estimate (Customer)
POST /api/bookings (Customer) → Save BOOKING_ID

# 4. Execute Ride
POST /api/rides/{RIDE_ID}/accept (Driver)
PATCH /api/rides/{RIDE_ID}/start (Driver)
PUT /api/rides/{RIDE_ID}/location (Driver)
PATCH /api/rides/{RIDE_ID}/complete (Driver)

# 5. Payment & Review
POST /api/payments (Customer)
POST /api/reviews (Customer)

# 6. Security Tests
POST /api/auth/refresh
POST /api/auth/revoke
POST /api/auth/logout-all

# 7. Health Checks
GET /health/live
GET /health/ready
GET /metrics/circuit-breakers
```

---

## 🎯 Expected Test Results

✅ **Authentication**: Token-based auth works  
✅ **Refresh Tokens**: Auto rotation on refresh  
✅ **Token Revocation**: Revoked tokens rejected  
✅ **Circuit Breaker**: Auto fail-fast when service down  
✅ **Graceful Degradation**: Fallback responses returned  
✅ **Health Checks**: Services report status correctly  
✅ **RBAC**: Role-based access works  
✅ **Real-time**: WebSocket/RabbitMQ events delivered  

---

## 🔧 Postman Collection

Import this JSON to Postman for automated testing:

**Variables:**
- `BASE_URL`: http://localhost:3000
- `CUSTOMER_TOKEN`: (auto-set after login)
- `DRIVER_TOKEN`: (auto-set after driver login)
- `BOOKING_ID`: (auto-set after booking)
- `RIDE_ID`: (auto-set after ride creation)
