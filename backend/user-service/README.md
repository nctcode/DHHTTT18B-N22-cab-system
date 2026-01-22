# User Service

The User Service manages customer and user profile data for the cab booking system. It handles customer registration, profile management, verification, and user preferences.

## Features

- Customer profile management
- User profile and preferences
- Email and phone verification
- Customer statistics tracking
- Notification preferences management
- Account activation/deactivation
- Ride history statistics

## Technology Stack

- Node.js with Express.js
- PostgreSQL with Prisma ORM
- Redis for caching
- Docker for containerization

## Prerequisites

- Node.js (v18+)
- PostgreSQL
- Redis

## Installation

```bash
cd backend/user-service
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your configuration:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/cab_user_service
REDIS_URL=redis://localhost:6379/0
PORT=5003
```

## Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Customer Endpoints

#### Register Customer Profile
- **POST** `/api/users/customers/:customerId/register`
- Register a new customer profile
- Required fields: firstName, lastName, email, phone

#### Get Customer Profile
- **GET** `/api/users/customers/:customerId`
- Retrieve customer profile information

#### Update Customer Profile
- **PUT** `/api/users/customers/:customerId`
- Update customer profile details

#### Record Ride Completion
- **POST** `/api/users/customers/:customerId/ride-completion`
- Record completed ride and update statistics
- Required fields: fare (optional: rating)

#### Get Customer Statistics
- **GET** `/api/users/customers/:customerId/stats`
- Retrieve customer ride statistics and metrics

#### Verify Customer
- **POST** `/api/users/customers/:customerId/verify`
- Mark customer as verified

#### Deactivate Customer
- **POST** `/api/users/customers/:customerId/deactivate`
- Deactivate customer account

#### Activate Customer
- **POST** `/api/users/customers/:customerId/activate`
- Reactivate customer account

#### Delete Customer
- **DELETE** `/api/users/customers/:customerId`
- Permanently delete customer profile

#### Get All Customers (Admin)
- **GET** `/api/users/customers?skip=0&take=10`
- List all customers with pagination

### Profile Endpoints

#### Get User Profile
- **GET** `/api/users/profiles/:userId`
- Retrieve full user profile with user data

#### Update User Profile
- **PUT** `/api/users/profiles/:userId`
- Update user profile information

#### Update Notification Preferences
- **PUT** `/api/users/profiles/:userId/notifications`
- Update notification settings

#### Verify Phone
- **POST** `/api/users/profiles/:userId/verify-phone`
- Mark phone as verified

#### Verify Email
- **POST** `/api/users/profiles/:userId/verify-email`
- Mark email as verified

#### Get Verification Details
- **GET** `/api/users/profiles/:userId/verification`
- Retrieve verification status

#### Get User Preferences
- **GET** `/api/users/profiles/:userId/preferences`
- Retrieve user preferences and settings

#### Update Verification Status
- **PUT** `/api/users/profiles/:userId/verification-status`
- Update verification status (PENDING, VERIFIED, REJECTED)

#### Delete Profile
- **DELETE** `/api/users/profiles/:userId`
- Permanently delete user profile

## Docker

Build and run the service using Docker:

```bash
# Build image
docker build -t user-service:latest .

# Run container
docker run -p 5003:5003 --env-file .env user-service:latest
```

## Database Schema

The service uses Prisma ORM with the following main entities:

### Customer
- customerId (unique identifier)
- firstName, lastName
- email, phone
- profile picture, address details
- rideCount, totalSpent, averageRating
- isVerified, isActive timestamps

### UserProfile
- userId (reference to User table)
- bio, profile picture
- contact information
- preferences, socialLinks
- verification status
- notification preferences

## Error Handling

The service implements comprehensive error handling with appropriate HTTP status codes:
- 400: Bad Request (validation errors)
- 404: Not Found (resource not found)
- 500: Internal Server Error

## Health Check

Health check endpoint available at:
- **GET** `/health`

## Contributing

Follow the existing code structure and patterns. Ensure all new endpoints include proper validation and error handling.

## License

ISC
