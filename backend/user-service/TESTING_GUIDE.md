# User Service - Testing Guide

## Quick Start

### Step 1: Start the Service
```bash
cd backend/user-service
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

Service runs on: `http://localhost:5003`

---

## Testing Flow (Recommended Order)

### 1. REGISTER CUSTOMER (POST)

**Endpoint:** `POST http://localhost:5003/api/users/customers/register/user-001`

**Description:** Create a new customer profile with userId = `user-001`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "phoneNumber": "+84912345678",
  "homeAddress": "123 Nguyen Hue St, District 1, Ho Chi Minh City",
  "workAddress": "456 Ton That Tung St, District 4, Ho Chi Minh City",
  "emergencyContact": "John Doe +84987654321"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Customer profile created successfully",
  "data": {
    "id": "clxxxxxx", // <-- SAVE THIS ID for next tests
    "userId": "user-001",
    "phoneNumber": "+84912345678",
    "homeAddress": "123 Nguyen Hue St, District 1, Ho Chi Minh City",
    "workAddress": "456 Ton That Tung St, District 4, Ho Chi Minh City",
    "emergencyContact": "John Doe +84987654321",
    "rideCount": 0,
    "totalSpent": 0,
    "averageRating": 5,
    "isVerified": false,
    "isActive": true,
    "isBlocked": false,
    "createdAt": "2024-01-22T10:00:00.000Z",
    "updatedAt": "2024-01-22T10:00:00.000Z"
  }
}
```

---

### 2. GET CUSTOMER BY USER ID (GET) - EASY WAY

**Endpoint:** `GET http://localhost:5003/api/users/customers/by-user/user-001`

**Description:** Get customer profile using userId (same one you used to register)

**Headers:**
```
Content-Type: application/json
```

**No Body Needed**

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxx",
    "userId": "user-001",
    "phoneNumber": "+84912345678",
    ...
  }
}
```

✅ **This should work now! No "Customer not found" error**

---

### 3. GET CUSTOMER BY CUSTOMER ID (GET) - ADVANCED WAY

**Endpoint:** `GET http://localhost:3003/api/users/customers/{id}`

Replace `{id}` with the `id` from the POST response (the auto-generated one like `clxxxxxx`)

**Example:** `GET http://localhost:3003/api/users/customers/clxxxxxx`

**Headers:**
```
Content-Type: application/json
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxx",
    "userId": "user-001",
    ...
  }
}
```

---

### 4. GET ALL CUSTOMERS (GET)

**Endpoint:** `GET http://localhost:3003/api/users/customers?skip=0&take=10`

**Description:** List all customers with pagination

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `take`: Number of records to return (default: 10, max: 100)

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxx",
      "userId": "user-001",
      "phoneNumber": "+84912345678",
      ...
    },
    {
      "id": "clyyyyyy",
      "userId": "user-002",
      ...
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 10,
    "total": 2
  }
}
```

---

### 5. UPDATE CUSTOMER PROFILE (PUT)

**Endpoint:** `PUT http://localhost:3003/api/users/customers/{id}`

Replace `{id}` with customer ID from step 1

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "phoneNumber": "+84912345679",
  "homeAddress": "789 Updated Street, District 1, Ho Chi Minh City",
  "workAddress": "321 New Work St, District 7, Ho Chi Minh City",
  "emergencyContact": "Jane Doe +84988888888"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer profile updated successfully",
  "data": {
    "id": "clxxxxxx",
    "phoneNumber": "+84912345679",
    "homeAddress": "789 Updated Street, District 1, Ho Chi Minh City",
    ...
  }
}
```

---

### 6. VERIFY CUSTOMER (POST)

**Endpoint:** `POST http://localhost:3003/api/users/customers/{id}/verify`

Replace `{id}` with customer ID

**Headers:**
```
Content-Type: application/json
```

**No Body Needed**

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer verified successfully",
  "data": {
    "id": "clxxxxxx",
    "isVerified": true,
    ...
  }
}
```

---

### 7. RECORD RIDE COMPLETION (POST)

**Endpoint:** `POST http://localhost:3003/api/users/customers/{id}/ride-completion`

Replace `{id}` with customer ID

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "fare": 250000,
  "rating": 5
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Ride statistics updated",
  "data": {
    "id": "clxxxxxx",
    "rideCount": 1,
    "totalSpent": 250000,
    "averageRating": 5,
    "totalRating": 5,
    "numberOfRatings": 1,
    ...
  }
}
```

**Test Multiple Rides:**
- Call this endpoint 3 times with different fares and ratings to see stats accumulate
- Fare examples: 200000, 150000, 300000
- Rating examples: 4, 3, 5

---

### 8. GET CUSTOMER STATS (GET)

**Endpoint:** `GET http://localhost:3003/api/users/customers/{id}/stats`

Replace `{id}` with customer ID

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "rideCount": 3,
    "totalSpent": 650000,
    "averageRating": 4.33,
    "isVerified": true,
    "joinedAt": "2024-01-22T10:00:00.000Z"
  }
}
```

---

### 9. DEACTIVATE CUSTOMER (POST)

**Endpoint:** `POST http://localhost:3003/api/users/customers/{id}/deactivate`

Replace `{id}` with customer ID

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer account deactivated",
  "data": {
    "id": "clxxxxxx",
    "isActive": false,
    ...
  }
}
```

---

### 10. ACTIVATE CUSTOMER (POST)

**Endpoint:** `POST http://localhost:3003/api/users/customers/{id}/activate`

Replace `{id}` with customer ID

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer account activated",
  "data": {
    "id": "clxxxxxx",
    "isActive": true,
    ...
  }
}
```

---

### 11. DELETE CUSTOMER (DELETE)

**Endpoint:** `DELETE http://localhost:3003/api/users/customers/{id}`

Replace `{id}` with customer ID

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer deleted successfully",
  "data": {
    "id": "clxxxxxx",
    ...
  }
}
```

---

## PROFILE ENDPOINTS

### 12. GET USER PROFILE (GET)

**Endpoint:** `GET http://localhost:3003/api/users/profiles/{userId}`

Replace `{userId}` with userId (like `user-001`)

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user-001",
    "bio": null,
    "profilePicture": null,
    "gender": null,
    "dateOfBirth": null,
    "verificationStatus": "PENDING",
    "isPhoneVerified": false,
    "isEmailVerified": false,
    ...
  }
}
```

---

### 13. UPDATE USER PROFILE (PUT)

**Endpoint:** `PUT http://localhost:3003/api/users/profiles/{userId}`

Replace `{userId}` with userId

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "bio": "I am a professional driver with 5 years experience",
  "gender": "Male",
  "dateOfBirth": "1990-05-15",
  "preferences": {
    "paymentMethod": "cash",
    "musicPreference": "pop"
  },
  "socialLinks": {
    "facebook": "https://facebook.com/user001"
  }
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "userId": "user-001",
    "bio": "I am a professional driver with 5 years experience",
    "gender": "Male",
    ...
  }
}
```

---

### 14. VERIFY PHONE (POST)

**Endpoint:** `POST http://localhost:3003/api/users/profiles/{userId}/verify-phone`

**Body:**
```json
{
  "verificationCode": "123456"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Phone verified successfully",
  "data": {
    "userId": "user-001",
    "isPhoneVerified": true,
    ...
  }
}
```

---

### 15. VERIFY EMAIL (POST)

**Endpoint:** `POST http://localhost:3003/api/users/profiles/{userId}/verify-email`

**Body:**
```json
{
  "verificationCode": "654321"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "userId": "user-001",
    "isEmailVerified": true,
    ...
  }
}
```

---

### 16. UPDATE NOTIFICATION PREFERENCES (PUT)

**Endpoint:** `PUT http://localhost:3003/api/users/profiles/{userId}/notifications`

**Body:**
```json
{
  "email": true,
  "sms": false,
  "push": true
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification preferences updated",
  "data": {
    "userId": "user-001",
    "notificationPreferences": {
      "email": true,
      "sms": false,
      "push": true
    },
    ...
  }
}
```

---

## Postman Collection Template

Save this as a `.json` file and import into Postman:

```json
{
  "info": {
    "name": "User Service API",
    "version": "1.0.0"
  },
  "item": [
    {
      "name": "Register Customer",
      "request": {
        "method": "POST",
        "url": "http://localhost:3003/api/users/customers/register/user-001",
        "body": {
          "mode": "raw",
          "raw": "{\"phoneNumber\": \"+84912345678\", \"homeAddress\": \"123 Nguyen Hue St\"}"
        }
      }
    },
    {
      "name": "Get Customer by User ID",
      "request": {
        "method": "GET",
        "url": "http://localhost:3003/api/users/customers/by-user/user-001"
      }
    }
  ]
}
```

---

## Common Issues & Solutions

### Issue 1: "Customer not found"
**Solution:** Use the endpoint `GET .../by-user/user-001` instead of `.../customers/{id}` if you don't have the auto-generated ID yet.

### Issue 2: Validation error on phone number
**Solution:** Phone number is optional. Use valid format like `+84912345678` or omit it.

### Issue 3: "Customer not found" after POST
**Solution:** The service was just started. Database might need migration:
```bash
npx prisma migrate dev
npm run dev
```

### Issue 4: Port 3003 already in use
**Solution:** Change PORT in `.env` file or kill the process:
```bash
# On Linux/Mac
lsof -i :3003
kill -9 <PID>

# On Windows
netstat -ano | findstr :3003
taskkill /PID <PID> /F
```

---

## Environment Variables

Create `.env` file:
```
PORT=3003
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/cab_user_db
```

---

## Summary

✅ **Flow for complete testing:**
1. POST register customer (save the ID)
2. GET by user ID to verify registration
3. PUT to update profile
4. POST verify customer
5. POST ride completion (3 times to test stats)
6. GET stats to see accumulated data
7. PUT to deactivate
8. POST to reactivate
9. DELETE to remove

All data persists in database until deleted!
