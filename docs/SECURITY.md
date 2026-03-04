# Security Architecture & Zero Trust Implementation

## Overview

This document outlines the security architecture and Zero Trust implementation for the CAB Booking System. All security measures are designed following the principle: **"Never trust, always verify"**.

## Architecture Compliance

✅ **Implemented Components:**

| Layer | Component | Status | Implementation |
|-------|-----------|--------|----------------|
| **Client → Edge** | HTTPS/TLS | ✅ | Configured (TLS 1.3 recommended) |
| **Edge** | WAF Protection | ✅ | [waf.middleware.js](file:///d:/HTTT18B/Nam4_2/BigData/DHHTTT18B-N22-cab-system/backend/api-gateway/src/middlewares/waf.middleware.js) |
| **Edge** | Rate Limiting | ✅ | Per IP, user, device |
| **API Gateway** | JWT/OAuth2 | ✅ | Short-lived access tokens (15min) |
| **API Gateway** | Refresh Tokens | ✅ | Long-lived (7 days) with rotation |
| **API Gateway** | Token Revocation | ✅ | Redis blacklist |
| **API Gateway** | RBAC | ✅ | Customer/Driver/Admin roles |
| **API Gateway** | ABAC | ✅ | Context-based policies |
| **Services** | Service Auth | ✅ | API key validation |
| **Platform** | Audit Logs | ✅ | Centralized logging |

## Security Features

### 1. Authentication & Authorization

#### JWT Token Management
- **Access Token**: 15 minutes expiry
- **Refresh Token**: 7 days expiry
- **Token Rotation**: New tokens generated on each refresh
- **Revocation**: Redis blacklist for compromised tokens

**Files:**
- [token.service.js](file:///d:/HTTT18B/Nam4_2/BigData/DHHTTT18B-N22-cab-system/backend/auth-service/src/services/token.service.js)
- [refreshToken.controller.js](file:///d:/HTTT18B/Nam4_2/BigData/DHHTTT18B-N22-cab-system/backend/auth-service/src/controllers/refreshToken.controller.js)

#### ABAC Policies
- **Driver Location Update**: Only during active rides
- **Ride Access**: Only participants (customer/driver)
- **Payment**: Only ride owner, within 24h of completion
- **Review**: Only customer, after ride completion

**File:** [abac.middleware.js](file:///d:/HTTT18B/Nam4_2/BigData/DHHTTT18B-N22-cab-system/backend/api-gateway/src/middlewares/abac.middleware.js)

### 2. WAF Protection

Protects against:
- SQL Injection
- XSS (Cross-Site Scripting)
- Path Traversal
- Command Injection

**File:** [waf.middleware.js](file:///d:/HTTT18B/Nam4_2/BigData/DHHTTT18B-N22-cab-system/backend/api-gateway/src/middlewares/waf.middleware.js)

### 3. Service-to-Service Authentication

Each microservice has a unique API key for internal communication:

```javascript
// Example: Service making internal call
headers: {
  'X-Service-Identity': 'booking-service',
  'X-API-Key': process.env.BOOKING_SERVICE_API_KEY
}
```

**File:** [serviceAuth.middleware.js](file:///d:/HTTT18B/Nam4_2/BigData/DHHTTT18B-N22-cab-system/backend/api-gateway/src/middlewares/serviceAuth.middleware.js)

### 4. Audit Logging

Logs all security-critical events:
- Login attempts (success/failure)
- Payment transactions
- Permission changes
- WAF blocks
- Access denials

**File:** [audit-logger/index.js](file:///d:/HTTT18B/Nam4_2/BigData/DHHTTT18B-N22-cab-system/backend/shared/audit-logger/index.js)

### 5. Data Protection

#### Encryption
- Algorithm: AES-256-GCM
- Use for: PII, payment data

#### Masking
- Email: `j**n.d**@example.com`
- Phone: `+849012****7`
- Credit Card: `4111 **** **** 1111`

**File:** [encryption/index.js](file:///d:/HTTT18B/Nam4_2/BigData/DHHTTT18B-N22-cab-system/backend/shared/encryption/index.js)

## API Endpoints

### Token Management

```
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/logout-all
POST /api/auth/revoke
```

## Environment Variables

### ⚠️ CRITICAL: Update These Before Production!

```env
# Auth Service
JWT_SECRET=<generate-strong-secret-key>
JWT_REFRESH_SECRET=<generate-different-secret-key>
REDIS_HOST=redis
REDIS_PORT=6379

# Encryption
ENCRYPTION_KEY=<generate-32-byte-key>

# Service API Keys (each service)
BOOKING_SERVICE_API_KEY=<unique-key>
RIDE_SERVICE_API_KEY=<unique-key>
DRIVER_SERVICE_API_KEY=<unique-key>
PAYMENT_SERVICE_API_KEY=<unique-key>
NOTIF_SERVICE_API_KEY=<unique-key>
```

### Generate Secure Keys

```bash
# Generate JWT secrets (use different ones!)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate service API keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Security Testing

### 1. Token Rotation Test

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Response includes accessToken and refreshToken
# Use refresh token to get new tokens
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer <REFRESH_TOKEN>"

# Old refresh token should now be invalid
```

### 2. Token Revocation Test

```bash
# Revoke a token
curl -X POST http://localhost:3000/api/auth/revoke \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"token":"<TOKEN_TO_REVOKE>","type":"access"}'

# Try using revoked token
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <REVOKED_TOKEN>"
# Expected: 401 TOKEN_REVOKED
```

### 3. WAF Protection Test

```bash
# SQL Injection attempt
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin'\''--","password":"test"}'
# Expected: 400 WAF_BLOCKED

# XSS attempt
curl -X POST http://localhost:3000/api/reviews \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"comment":"<script>alert(1)</script>","rating":5}'
# Expected: 400 WAF_BLOCKED
```

### 4. ABAC Policy Test

```bash
# Driver trying to update location without active ride
curl -X PUT http://localhost:3000/api/drivers/location \
  -H "Authorization: Bearer <DRIVER_TOKEN_NO_RIDE>" \
  -H "Content-Type: application/json" \
  -d '{"lat":21.0285,"lng":105.8342}'
# Expected: 403 ABAC_DENIED
```

### 5. Service Auth Test

```bash
# External call to internal endpoint
curl -X POST http://localhost:3000/internal/assign-driver
# Expected: 403 INTERNAL_ONLY

# Valid service call
curl -X POST http://localhost:3000/internal/assign-driver \
  -H "X-Service-Identity: ride-service" \
  -H "X-API-Key: <RIDE_SERVICE_KEY>"
# Expected: 200 OK
```

## Incident Response

### Token Compromise

1. Revoke compromised token:
```bash
curl -X POST /api/auth/revoke \
  -d '{"token":"<COMPROMISED_TOKEN>"}'
```

2. Force user to logout from all devices:
```bash
curl -X POST /api/auth/logout-all \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

3. Check audit logs for suspicious activity

### Suspicious Activity Detection

Monitor audit logs for:
- Multiple failed login attempts
- WAF blocks from same IP
- Token usage after revocation
- Access attempts outside business hours

## Compliance

### GDPR/PDPA

✅ **Implemented:**
- Data encryption for PII
- Data masking in logs
- Audit trail for data access
- Right to be forgotten (token revocation)

### PCI DSS (Payment Card Industry)

✅ **Implemented:**
- Payment data encryption
- Credit card masking
- Audit logging for payments
- Secure token transmission

## Monitoring & Alerts

### Critical Events (Immediate Alert)

- Multiple WAF blocks from same IP
- Multiple failed login attempts
- Token revocation
- Payment failures

### Warning Events

- Access denied (ABAC)
- Rate limit exceeded
- Suspicious activity patterns

## Threat Model

| Threat | Mitigation | Implementation |
|--------|------------|----------------|
| **Token theft** | Token rotation + revocation | ✅ Refresh token system |
| **Service compromise** | Service authentication | ✅ API key validation |
| **Lateral movement** | Service isolation | ✅ Service identity |
| **Insider threat** | Audit logging | ✅ Comprehensive logs |
| **DDoS** | Rate limiting | ✅ IP/user limits |
| **SQL Injection** | WAF | ✅ Input validation |
| **XSS** | WAF + CSP | ✅ Content sanitization |
| **Data breach** | Encryption | ✅ AES-256-GCM |

## Future Enhancements

### Priority 1
- [ ] mTLS for service-to-service communication
- [ ] HashiCorp Vault integration
- [ ] MFA for admin accounts

### Priority 2
- [ ] SIEM real-time monitoring
- [ ] Automated threat response
- [ ] Penetration testing

### Priority 3
- [ ] Device fingerprinting
- [ ] Behavioral analytics
- [ ] Dark web monitoring

## Support

For security issues, contact: security@cab-booking-system.com

**DO NOT** publicly disclose security vulnerabilities.
