# Docker Setup Guide for Security & Resilience Features

## Prerequisites

- Docker Desktop installed
- Docker Compose V2
- Node.js 18+ (for local development)

## Quick Start

### 1. Install Dependencies

**For Windows (PowerShell):**
```powershell
.\install-dependencies.ps1
```

**For Linux/Mac:**
```bash
chmod +x install-dependencies.sh
./install-dependencies.sh
```

**Or manually:**
```bash
cd backend/shared/resilience
npm install

cd ../api-gateway
npm install

cd ../auth-service
npm install
```

---

### 2. Generate Secure Secrets

⚠️ **CRITICAL**: Change default JWT_SECRET before production!

**Generate JWT Secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Generate Service API Keys:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 3. Update Environment Variables

Edit the following files and replace placeholders:

**`backend/api-gateway/.env`:**
```env
JWT_ACCESS SECRET=<generated-secret-1>
JWT_REFRESH_SECRET=<generated-secret-2>
ENCRYPTION_KEY=<generated-encryption-key>
BOOKING_SERVICE_API_KEY=<generated-key-1>
RIDE_SERVICE_API_KEY=<generated-key-2>
DRIVER_SERVICE_API_KEY=<generated-key-3>
PAYMENT_SERVICE_API_KEY=<generated-key-4>
NOTIF_SERVICE_API_KEY=<generated-key-5>
```

**`backend/auth-service/.env`:**
```env
JWT_ACCESS_SECRET=<same-as-api-gateway>
JWT_REFRESH_SECRET=<same-as-api-gateway>
```

---

### 4. Build Docker Images

```bash
docker-compose build
```

This will:
- Build all microservices
- Install dependencies inside containers
- Copy source code

---

### 5. Start Services

**Start all services:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f
```

**View specific service logs:**
```bash
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
```

---

### 6. Verify Health Checks

**Check service health:**
```bash
# All services
docker-compose ps

# API Gateway health (new endpoints)
curl http://localhost:3000/health/live      # Liveness probe
curl http://localhost:3000/health/ready     # Readiness probe
curl http://localhost:3000/health          # Detailed health

# Auth Service
curl http://localhost:3001/health

# Circuit Breaker Metrics
curl http://localhost:3000/metrics/circuit-breakers
```

---

## Services Overview

| Service | Port | Health Check |
|---------|------|--------------|
| **API Gateway** | 3000 | `/health/live`, `/health/ready` |
| **Auth Service** | 3001 | `/health` |
| **User Service** | 3002 | `/health` |
| **Driver Service** | 3003 | `/health` |
| **Booking Service** | 3004 | `/health` |
| **Ride Service** | 3005 | `/health` |
| **Payment Service** | 3006 | `/health` |
| **Pricing Service** | 3007 | `/health` |
| **Notification Service** | 3008 | `/health` |
| **Review Service** | 3009 | `/health` |

**Infrastructure:**
| Service | Port | UI |
|---------|------|-----|
| **Redis** | 6379 | - |
| **RabbitMQ** | 5672 | http://localhost:15672 (guest/guest) |
| **MongoDB** | 27017 | - |
| **PostgreSQL** | 5432+ | - |

---

## New Features Enabled

### ✅ Security Features

1. **Refresh Tokens**
   - Access tokens: 15 min
   - Refresh tokens: 7 days
   - Auto rotation on refresh

2. **Token Revocation**
   - Redis blacklist
   - Logout from all devices
   - Immediate token invalidation

3. **WAF Protection**
   - SQL injection detection
   - XSS prevention
   - Path traversal blocking

4. **ABAC Policies**
   - Context-based access control
   - Time/location-based rules

5. **Audit Logging**
   - Login attempts
   - Payment transactions
   - Security events

### ✅ Resilience Features

1. **Circuit Breaker**
   - Auto fail-fast when service down
   - Configurable thresholds
   - Fallback responses

2. **Retry with Exponential Backoff**
   - 3 retries with jitter
   - Transient error handling
   - Dead Letter Queue

3. **Graceful Degradation**
   - Cache-based fallback
   - Feature toggles
   - Default responses

4. **Health Checks**
   - Liveness probes
   - Readiness probes
   - Dependency checks

---

## Testing

### 1. Token Management

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

**Refresh Token:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer <REFRESH_TOKEN>"
```

**Revoke Token:**
```bash
curl -X POST http://localhost:3000/api/auth/revoke \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"token":"<TOKEN_TO_REVOKE>","type":"access"}'
```

### 2. Circuit Breaker

**Simulate service down:**
```bash
docker stop cab-booking-user-service

# Make request
curl http://localhost:3000/api/users/123

# Should return fallback response
```

**Check circuit state:**
```bash
curl http://localhost:3000/metrics/circuit-breakers
```

### 3. Health Checks

```bash
# Should return healthy
curl http://localhost:3000/health/ready

# Stop Redis
docker stop cab-booking-redis

# Should show degraded but still functional
curl http://localhost:3000/health/ready
```

---

## Troubleshooting

### Services not starting

**Check logs:**
```bash
docker-compose logs <service-name>
```

**Common issues:**
1. Port already in use → Change port in docker-compose.yml
2. Dependencies not installed → Run install script again
3. Database not ready → Wait for health check to pass

### Redis connection failed

```bash
# Check Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### Health check failing

```bash
# Check if service is responding
curl http://localhost:3000/health/live

# Check dependencies
docker-compose ps

# Restart service
docker-compose restart api-gateway
```

---

## Stopping Services

**Stop all:**
```bash
docker-compose down
```

**Stop and remove volumes:**
```bash
docker-compose down -v
```

**Stop specific service:**
```bash
docker-compose stop api-gateway
```

---

## Development Mode

**Run services locally (without Docker):**

1. Start infrastructure:
```bash
docker-compose up -d redis rabbitmq mongodb postgres-auth postgres-user postgres-driver postgres-payment postgres-notification
```

2. Run services:
```bash
# Terminal 1 - Auth Service
cd backend/auth-service
npm run dev

# Terminal 2 - API Gateway
cd backend/api-gateway
npm run dev

# Terminal 3 - Other services
cd backend/user-service
npm run dev
```

---

## Monitoring

**Circuit Breaker Metrics:**
```bash
curl http://localhost:3000/metrics/circuit-breakers
```

**Response:**
```json
{
  "user-service": {
    "state": "CLOSED",
    "failures": 0,
    "successes": 150,
    "errorRate": 0.0
  }
}
```

**RabbitMQ Management UI:**
- URL: http://localhost:15672
- User: guest
- Password: guest

---

## Next Steps

1. ✅ All dependencies installed
2. ✅ Docker Compose configured
3. ⚠️ Update JWT secrets
4. ⚠️ Generate service API keys
5. 🚀 Deploy to Kubernetes (optional)

For Kubernetes deployment, use HPA manifests in `k8s/hpa/`
