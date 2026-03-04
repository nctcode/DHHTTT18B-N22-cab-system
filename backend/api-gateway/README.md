# API Gateway

API Gateway for Cab System - Routes and manages requests to microservices.

## Features

- 🔒 **Authentication & Authorization** - JWT-based authentication with role-based access control
- 🚦 **Rate Limiting** - Protect services from abuse with configurable rate limits
- 🛡️ **Security** - Helmet.js for security headers, CORS configuration
- 📝 **Logging** - Winston logger with file and console outputs
- 🔄 **Request Proxying** - Route requests to appropriate microservices
- ⚡ **Performance** - Response compression, caching headers
- 🏥 **Health Checks** - Monitor gateway and downstream services
- 🔍 **Request Validation** - Validate incoming requests
- 📊 **Monitoring** - Request logging and error tracking

## Architecture

The API Gateway acts as a single entry point for all client requests and routes them to the appropriate microservices:

```
Client -> API Gateway -> [Auth Service]
                      -> [User Service]
                      -> [Driver Service]
                      -> [Ride Service]
                      -> [Booking Service]
                      -> [Payment Service]
                      -> [Pricing Service]
                      -> [Notification Service]
                      -> [Review Service]
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration
```

## Configuration

Edit `.env` file:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key
CORS_ORIGIN=*

# Microservices URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
DRIVER_SERVICE_URL=http://localhost:3003
RIDE_SERVICE_URL=http://localhost:3004
BOOKING_SERVICE_URL=http://localhost:3005
PAYMENT_SERVICE_URL=http://localhost:3006
PRICING_SERVICE_URL=http://localhost:3007
NOTIFICATION_SERVICE_URL=http://localhost:3008
REVIEW_SERVICE_URL=http://localhost:3009
```

## Usage

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Routes

### Public Routes

- `GET /` - Welcome message
- `GET /health` - Gateway health check
- `GET /health/services` - All services health check

### Authentication Routes

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password

### User Routes (Protected)

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users` - Get all users (admin only)

### Driver Routes (Protected)

- `GET /api/drivers` - Get all drivers
- `GET /api/drivers/nearby` - Get nearby drivers
- `PUT /api/drivers/location` - Update driver location
- `PUT /api/drivers/status` - Update driver status

### Ride Routes (Protected)

- `POST /api/rides/request` - Request a ride
- `POST /api/rides/:id/accept` - Accept ride (driver)
- `POST /api/rides/:id/start` - Start ride (driver)
- `POST /api/rides/:id/complete` - Complete ride (driver)
- `POST /api/rides/:id/cancel` - Cancel ride
- `GET /api/rides/history` - Get ride history

### Booking Routes (Protected)

- `POST /api/bookings/create` - Create booking
- `POST /api/bookings/:id/confirm` - Confirm booking
- `POST /api/bookings/:id/cancel` - Cancel booking
- `GET /api/bookings` - Get all bookings

### Payment Routes (Protected)

- `POST /api/payments/process` - Process payment
- `POST /api/payments/refund` - Refund payment
- `GET /api/payments/methods` - Get payment methods
- `GET /api/payments/history` - Get payment history

### Pricing Routes (Protected)

- `POST /api/pricing/calculate` - Calculate price
- `POST /api/pricing/estimate` - Estimate price

### Notification Routes (Protected)

- `POST /api/notifications/send` - Send notification
- `GET /api/notifications` - Get notifications

### Review Routes (Protected)

- `POST /api/reviews/create` - Create review
- `GET /api/reviews/driver/:id` - Get driver reviews
- `GET /api/reviews/rider/:id` - Get rider reviews

## Middleware

### Authentication

```javascript
const { verifyToken, checkRole } = require('./middlewares/auth.middleware');

// Verify JWT token
router.use(verifyToken);

// Check user role
router.use(checkRole('admin', 'driver'));
```

### Rate Limiting

```javascript
const { authLimiter, paymentLimiter } = require('./middlewares/rate-limit.middleware');

// Apply to specific routes
router.use('/api/auth', authLimiter);
router.use('/api/payments', paymentLimiter);
```

## Docker

```bash
# Build image
docker build -t api-gateway .

# Run container
docker run -p 3000:3000 --env-file .env api-gateway
```

## Error Handling

All errors are caught and returned in a consistent format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": []
}
```

## Logging

Logs are stored in:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

## Security Features

- **Helmet.js** - Sets security headers
- **CORS** - Configurable cross-origin resource sharing
- **Rate Limiting** - Prevent brute force attacks
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - Validate all incoming requests
- **Request Size Limits** - Prevent payload attacks

## Performance

- **Compression** - Gzip compression for responses
- **Connection Pooling** - Reuse HTTP connections
- **Caching** - Cache frequently accessed data
- **Load Balancing** - Ready for horizontal scaling

## Monitoring

Monitor the gateway health:

```bash
# Check gateway
curl http://localhost:3000/health

# Check all services
curl http://localhost:3000/health/services
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | JWT secret key | Required |
| `CORS_ORIGIN` | CORS origin | `*` |
| `AUTH_SERVICE_URL` | Auth service URL | `http://localhost:3001` |
| `USER_SERVICE_URL` | User service URL | `http://localhost:3002` |
| `DRIVER_SERVICE_URL` | Driver service URL | `http://localhost:3003` |

## License

ISC
