# User Service - API Endpoints Documentation

## Base URL
```
http://localhost:5003/api/users
```

---

## CUSTOMER ENDPOINTS

### 1. Register Customer Profile
**Method:** POST  
**Endpoint:** `/customers/register/:userId`  
**Description:** Create a new customer profile after user registration

**Path Parameters:**
- `userId` (string, required): Unique user identifier

**Request Body:**
```json
{
  "phoneNumber": "+84912345678",
  "homeAddress": "123 Nguyen Hue Street, HCMC",
  "workAddress": "456 Tran Hung Dao, HCMC",
  "emergencyContact": "John Doe"
}
```

**Sample cURL:**
```bash
curl -X POST http://localhost:3003/api/users/customers/register/user-001 \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+84912345678",
    "homeAddress": "123 Nguyen Hue Street, HCMC",
    "workAddress": "456 Tran Hung Dao, HCMC",
    "emergencyContact": "John Doe"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Customer profile created successfully",
  "data": {
    "id": "cust-001",
    "userId": "user-001",
    "phoneNumber": "+84912345678",
    "homeAddress": "123 Nguyen Hue Street, HCMC",
    "workAddress": "456 Tran Hung Dao, HCMC",
    "emergencyContact": "John Doe",
    "rideCount": 0,
    "totalSpent": 0.0,
    "averageRating": 5.0,
    "isVerified": false,
    "isActive": true,
    "isBlocked": false,
    "createdAt": "2024-01-22T10:30:00Z"
  }
}
```

---

### 2. Get Customer Profile
**Method:** GET  
**Endpoint:** `/customers/:customerId`  
**Description:** Retrieve customer profile by customer ID

**Path Parameters:**
- `customerId` (string, required): Customer identifier

**Sample cURL:**
```bash
curl -X GET http://localhost:3003/api/users/customers/cust-001
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cust-001",
    "userId": "user-001",
    "phoneNumber": "+84912345678",
    "homeAddress": "123 Nguyen Hue Street, HCMC",
    "workAddress": "456 Tran Hung Dao, HCMC",
    "emergencyContact": "John Doe",
    "rideCount": 5,
    "totalSpent": 250000,
    "averageRating": 4.8,
    "isVerified": true,
    "isActive": true,
    "isBlocked": false,
    "lastActivityAt": "2024-01-22T15:45:00Z"
  }
}
```

---

### 3. Get All Customers (Admin)
**Method:** GET  
**Endpoint:** `/customers`  
**Description:** Retrieve all customers with pagination

**Query Parameters:**
- `skip` (integer, optional, default=0): Number of records to skip
- `take` (integer, optional, default=10, max=100): Number of records to return

**Sample cURL:**
```bash
curl -X GET "http://localhost:3003/api/users/customers?skip=0&take=10"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cust-001",
      "userId": "user-001",
      "rideCount": 5,
      "totalSpent": 250000,
      "averageRating": 4.8,
      "isVerified": true
    },
    {
      "id": "cust-002",
      "userId": "user-002",
      "rideCount": 3,
      "totalSpent": 150000,
      "averageRating": 4.5,
      "isVerified": false
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

### 4. Update Customer Profile
**Method:** PUT  
**Endpoint:** `/customers/:customerId`  
**Description:** Update customer information

**Path Parameters:**
- `customerId` (string, required): Customer identifier

**Request Body:**
```json
{
  "phoneNumber": "+84987654321",
  "homeAddress": "789 Hai Ba Trung, Ha Noi",
  "workAddress": "321 Le Loi, Ha Noi",
  "emergencyContact": "Jane Smith"
}
```

**Sample cURL:**
```bash
curl -X PUT http://localhost:3003/api/users/customers/cust-001 \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+84987654321",
    "homeAddress": "789 Hai Ba Trung, Ha Noi"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer profile updated successfully",
  "data": {
    "id": "cust-001",
    "phoneNumber": "+84987654321",
    "homeAddress": "789 Hai Ba Trung, Ha Noi"
  }
}
```

---

### 5. Record Ride Completion
**Method:** POST  
**Endpoint:** `/customers/:customerId/ride-completion`  
**Description:** Update ride statistics after trip completion

**Path Parameters:**
- `customerId` (string, required): Customer identifier

**Request Body:**
```json
{
  "fare": 85000,
  "rating": 5
}
```

**Sample cURL:**
```bash
curl -X POST http://localhost:3003/api/users/customers/cust-001/ride-completion \
  -H "Content-Type: application/json" \
  -d '{
    "fare": 85000,
    "rating": 5
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Ride statistics updated",
  "data": {
    "rideCount": 6,
    "totalSpent": 335000,
    "averageRating": 4.83,
    "lastActivityAt": "2024-01-22T16:20:00Z"
  }
}
```

---

### 6. Verify Customer
**Method:** POST  
**Endpoint:** `/customers/:customerId/verify`  
**Description:** Mark customer as verified

**Path Parameters:**
- `customerId` (string, required): Customer identifier

**Request Body:** (empty)

**Sample cURL:**
```bash
curl -X POST http://localhost:3003/api/users/customers/cust-001/verify
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer verified successfully",
  "data": {
    "id": "cust-001",
    "isVerified": true
  }
}
```

---

### 7. Deactivate Customer
**Method:** POST  
**Endpoint:** `/customers/:customerId/deactivate`  
**Description:** Deactivate customer account

**Path Parameters:**
- `customerId` (string, required): Customer identifier

**Sample cURL:**
```bash
curl -X POST http://localhost:3003/api/users/customers/cust-001/deactivate
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer account deactivated",
  "data": {
    "id": "cust-001",
    "isActive": false
  }
}
```

---

### 8. Activate Customer
**Method:** POST  
**Endpoint:** `/customers/:customerId/activate`  
**Description:** Activate customer account

**Path Parameters:**
- `customerId` (string, required): Customer identifier

**Sample cURL:**
```bash
curl -X POST http://localhost:3003/api/users/customers/cust-001/activate
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer account activated",
  "data": {
    "id": "cust-001",
    "isActive": true
  }
}
```

---

### 9. Delete Customer
**Method:** DELETE  
**Endpoint:** `/customers/:customerId`  
**Description:** Delete customer profile

**Path Parameters:**
- `customerId` (string, required): Customer identifier

**Sample cURL:**
```bash
curl -X DELETE http://localhost:3003/api/users/customers/cust-001
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

---

### 10. Get Customer Statistics
**Method:** GET  
**Endpoint:** `/customers/:customerId/stats`  
**Description:** Retrieve customer ride statistics

**Path Parameters:**
- `customerId` (string, required): Customer identifier

**Sample cURL:**
```bash
curl -X GET http://localhost:3003/api/users/customers/cust-001/stats
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "rideCount": 6,
    "totalSpent": 335000,
    "averageRating": 4.83,
    "isVerified": true,
    "joinedAt": "2024-01-22T10:30:00Z"
  }
}
```

---

## PROFILE ENDPOINTS

### 1. Get User Profile
**Method:** GET  
**Endpoint:** `/profiles/:userId`  
**Description:** Retrieve user profile

**Path Parameters:**
- `userId` (string, required): User identifier

**Sample cURL:**
```bash
curl -X GET http://localhost:3003/api/users/profiles/user-001
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user-001",
    "bio": "Love traveling by cab",
    "profilePicture": "https://example.com/avatar.jpg",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "address": "123 Nguyen Hue, HCMC",
    "city": "HCMC",
    "state": "Ho Chi Minh",
    "zipCode": "70000",
    "country": "Vietnam",
    "verificationStatus": "VERIFIED",
    "isPhoneVerified": true,
    "isEmailVerified": true,
    "lastActiveAt": "2024-01-22T16:20:00Z"
  }
}
```

---

### 2. Update User Profile
**Method:** PUT  
**Endpoint:** `/profiles/:userId`  
**Description:** Update user profile information

**Path Parameters:**
- `userId` (string, required): User identifier

**Request Body:**
```json
{
  "bio": "Professional driver",
  "dateOfBirth": "1990-05-15",
  "gender": "MALE",
  "address": "789 Tran Hung Dao, HCMC",
  "city": "HCMC",
  "state": "Ho Chi Minh",
  "zipCode": "70000",
  "country": "Vietnam",
  "emergencyContact": "Jane Doe",
  "emergencyContactPhone": "+84987654321"
}
```

**Sample cURL:**
```bash
curl -X PUT http://localhost:3003/api/users/profiles/user-001 \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Frequent traveler",
    "city": "Ha Noi",
    "address": "456 Ba Trieu, Ha Noi"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "userId": "user-001",
    "bio": "Frequent traveler",
    "city": "Ha Noi",
    "address": "456 Ba Trieu, Ha Noi"
  }
}
```

---

### 3. Update Notification Preferences
**Method:** PUT  
**Endpoint:** `/profiles/:userId/notifications`  
**Description:** Update user notification settings

**Path Parameters:**
- `userId` (string, required): User identifier

**Request Body:**
```json
{
  "email": true,
  "sms": true,
  "push": false
}
```

**Sample cURL:**
```bash
curl -X PUT http://localhost:3003/api/users/profiles/user-001/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "email": true,
    "sms": false,
    "push": true
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification preferences updated",
  "data": {
    "notificationPreferences": {
      "email": true,
      "sms": false,
      "push": true
    }
  }
}
```

---

### 4. Verify Phone Number
**Method:** POST  
**Endpoint:** `/profiles/:userId/verify-phone`  
**Description:** Mark phone number as verified

**Path Parameters:**
- `userId` (string, required): User identifier

**Sample cURL:**
```bash
curl -X POST http://localhost:3003/api/users/profiles/user-001/verify-phone
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Phone number verified",
  "data": {
    "isPhoneVerified": true
  }
}
```

---

### 5. Verify Email
**Method:** POST  
**Endpoint:** `/profiles/:userId/verify-email`  
**Description:** Mark email as verified

**Path Parameters:**
- `userId` (string, required): User identifier

**Sample cURL:**
```bash
curl -X POST http://localhost:3003/api/users/profiles/user-001/verify-email
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified",
  "data": {
    "isEmailVerified": true
  }
}
```

---

### 6. Update Last Active
**Method:** POST  
**Endpoint:** `/profiles/:userId/last-active`  
**Description:** Update user's last activity timestamp

**Path Parameters:**
- `userId` (string, required): User identifier

**Sample cURL:**
```bash
curl -X POST http://localhost:3003/api/users/profiles/user-001/last-active
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Last active timestamp updated",
  "data": {
    "lastActiveAt": "2024-01-22T17:00:00Z"
  }
}
```

---

### 7. Get Verification Details
**Method:** GET  
**Endpoint:** `/profiles/:userId/verification`  
**Description:** Retrieve verification status details

**Path Parameters:**
- `userId` (string, required): User identifier

**Sample cURL:**
```bash
curl -X GET http://localhost:3003/api/users/profiles/user-001/verification
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "verificationStatus": "VERIFIED",
    "isPhoneVerified": true,
    "isEmailVerified": true,
    "verificationDetails": {
      "phoneVerifiedAt": "2024-01-20T10:00:00Z",
      "emailVerifiedAt": "2024-01-19T14:30:00Z"
    }
  }
}
```

---

### 8. Get User Preferences
**Method:** GET  
**Endpoint:** `/profiles/:userId/preferences`  
**Description:** Retrieve user preferences

**Path Parameters:**
- `userId` (string, required): User identifier

**Sample cURL:**
```bash
curl -X GET http://localhost:3003/api/users/profiles/user-001/preferences
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "language": "vi",
      "currency": "VND",
      "theme": "dark",
      "shareLocation": true
    },
    "socialLinks": {
      "facebook": "https://facebook.com/user",
      "twitter": "https://twitter.com/user"
    }
  }
}
```

---

### 9. Update Verification Status
**Method:** PUT  
**Endpoint:** `/profiles/:userId/verification-status`  
**Description:** Update user verification status (admin only)

**Path Parameters:**
- `userId` (string, required): User identifier

**Request Body:**
```json
{
  "status": "VERIFIED"
}
```

Valid status values: `PENDING`, `VERIFIED`, `REJECTED`

**Sample cURL:**
```bash
curl -X PUT http://localhost:3003/api/users/profiles/user-001/verification-status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "VERIFIED"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification status updated",
  "data": {
    "verificationStatus": "VERIFIED"
  }
}
```

---

### 10. Delete Profile
**Method:** DELETE  
**Endpoint:** `/profiles/:userId`  
**Description:** Delete user profile

**Path Parameters:**
- `userId` (string, required): User identifier

**Sample cURL:**
```bash
curl -X DELETE http://localhost:3003/api/users/profiles/user-001
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

---

## Error Responses

### Validation Error (400)
```json
{
  "errors": [
    {
      "msg": "User ID is required",
      "param": "userId"
    }
  ]
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Customer not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Testing Order (Recommended)

1. **Register Customer** - POST `/customers/register/user-001`
2. **Get Customer** - GET `/customers/cust-001` (use the ID from step 1)
3. **Update Customer** - PUT `/customers/cust-001`
4. **Create Profile** - GET `/profiles/user-001` (create if needed)
5. **Record Ride** - POST `/customers/cust-001/ride-completion`
6. **Get Stats** - GET `/customers/cust-001/stats`
7. **Verify Customer** - POST `/customers/cust-001/verify`

---

## Notes

- Replace `user-001`, `cust-001` with actual IDs
- Phone numbers should follow E.164 format (e.g., +84912345678)
- Ratings should be between 1-5
- Fares should be positive numbers
- All timestamps are in ISO 8601 format (UTC)
