# User Service Setup Guide

## Prerequisites
- Node.js v18+
- PostgreSQL database
- npm or yarn

## Installation

### 1. Install Dependencies
```bash
cd backend/user-service
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and update the values:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
PORT=5003
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/cab_user_service
REDIS_URL=redis://localhost:6379/0
API_GATEWAY_URL=http://localhost:5000
AUTH_SERVICE_URL=http://localhost:5001
```

### 3. Setup Database

#### Generate Prisma Client
```bash
npx prisma generate
```

#### Run Migrations
```bash
npx prisma migrate dev --name init
```

This will:
- Create all database tables
- Set up indexes
- Configure foreign keys

#### (Optional) Seed Database
```bash
npx prisma db seed
```

### 4. Start the Service

**Development Mode (with hot reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The service will start on `http://localhost:5003`

## API Endpoints

### Customer Endpoints

#### Register Customer
- **POST** `/api/users/customers/register/:userId`
- **Body:**
```json
{
  "phoneNumber": "+84901234567",
  "homeAddress": "123 Main St, City",
  "workAddress": "456 Work Ave, City",
  "emergencyContact": "John Doe"
}
```

#### Get Customer Profile
- **GET** `/api/users/customers/:customerId`

#### Get All Customers (Admin)
- **GET** `/api/users/customers?skip=0&take=10`

#### Update Customer Profile
- **PUT** `/api/users/customers/:customerId`
- **Body:** Same fields as register

#### Record Ride Completion
- **POST** `/api/users/customers/:customerId/ride-completion`
- **Body:**
```json
{
  "fare": 50000,
  "rating": 5
}
```

#### Verify Customer
- **POST** `/api/users/customers/:customerId/verify`

#### Deactivate Customer
- **POST** `/api/users/customers/:customerId/deactivate`

#### Activate Customer
- **POST** `/api/users/customers/:customerId/activate`

#### Get Customer Statistics
- **GET** `/api/users/customers/:customerId/stats`

### Profile Endpoints

#### Get Full Profile
- **GET** `/api/users/profiles/:userId`

#### Update Profile
- **PUT** `/api/users/profiles/:userId`
- **Body:**
```json
{
  "bio": "User bio",
  "profilePicture": "url",
  "dateOfBirth": "1990-01-01",
  "gender": "MALE",
  "address": "123 Street",
  "city": "City",
  "state": "State",
  "zipCode": "12345",
  "country": "Country"
}
```

#### Verify Email
- **POST** `/api/users/profiles/:userId/verify-email`

#### Verify Phone
- **POST** `/api/users/profiles/:userId/verify-phone`

#### Update Notification Preferences
- **PUT** `/api/users/profiles/:userId/notification-preferences`
- **Body:**
```json
{
  "email": true,
  "sms": true,
  "push": true
}
```

## Troubleshooting

### Error: Cannot find module '../../prisma/client'
**Solution:** Run `npx prisma generate` to generate the Prisma client

### Error: Prisma schema not found
**Solution:** Ensure `prisma/schema.prisma` exists in the user-service directory

### Database connection failed
**Solution:** Check your `DATABASE_URL` environment variable and ensure PostgreSQL is running

### Migration failed
**Solution:** 
1. Check if database exists: `createdb cab_user_service`
2. Reset database: `npx prisma migrate reset`
3. Re-run migrations: `npx prisma migrate dev`

## Development

### View Database with Prisma Studio
```bash
npx prisma studio
```

### Run Tests
```bash
npm test
```

### Check Prettier/Linting
```bash
npm run lint
```

## Docker

### Build Docker Image
```bash
docker build -t user-service:latest .
```

### Run Docker Container
```bash
docker run -p 5003:5003 \
  -e DATABASE_URL=postgresql://... \
  user-service:latest
```

## File Structure
```
backend/user-service/
├── src/
│   ├── controllers/      # HTTP request handlers
│   ├── models/           # Database operations
│   ├── services/         # Business logic
│   ├── routes/           # API routes
│   ├── utils/            # Helper functions
│   ├── constants/        # Global constants
│   └── server.js         # Express server setup
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── client.js         # Prisma client
│   └── migrations/       # Database migrations
├── Dockerfile            # Docker configuration
├── package.json          # Dependencies
└── .env.example          # Environment variables template
```

## Key Features

- **Customer Profile Management**: Create, read, update customer profiles
- **User Profiles**: Extended user information with verification status
- **Ride Statistics**: Track rides, spending, and ratings
- **Payment Methods**: Manage customer payment options
- **Favorite Locations**: Store frequent addresses
- **Ride History**: Track all customer rides
- **Notification Preferences**: Customize communication settings
- **Verification System**: Email and phone verification

## Notes

- All customer IDs are UUIDs generated automatically
- Timestamps are in UTC
- Phone numbers should be in international format
- Database uses PostgreSQL with Prisma ORM
- Service communicates with other microservices via REST APIs
