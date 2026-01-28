# User Service - Cab Booking System

## Overview

User Service is responsible for managing user accounts and profiles in the cab booking system. It handles user registration, profile management, verification, and user statistics.

## Database Schema

**PostgreSQL Database with two main tables:**

### user_db table
```
id        (uuid, primary key)
name      (varchar, required)
phone     (varchar, unique, required)
avatar    (text, optional)
created_at (timestamp)
updated_at (timestamp)
```

### profile table
```
id                      (uuid, primary key)
userId                  (uuid, foreign key to user_db)
bio                     (text, optional)
dateOfBirth             (timestamp, optional)
gender                  (varchar, optional) - MALE, FEMALE, OTHER
address, city, state    (varchar, optional)
homeAddress, workAddress (varchar, optional)
rideCount               (integer, default: 0)
totalSpent              (float, default: 0)
averageRating           (float, default: 5.0)
isVerified              (boolean, default: false)
isPhoneVerified         (boolean, default: false)
isEmailVerified         (boolean, default: false)
isActive                (boolean, default: true)
isBlocked               (boolean, default: false)
created_at, updated_at  (timestamp)
```

## Quick Start

### Prerequisites
- Node.js (v14+)
- PostgreSQL
- npm or yarn

### Installation

```bash
cd backend/user-service

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Update DATABASE_URL in .env
# Example: postgresql://user:password@localhost:5432/user_service

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
```

The service will run on `http://localhost:5003`

## API Documentation

### Swagger UI
Once the service is running, access the interactive API documentation at:

```
http://localhost:5003/api-docs
```

### Quick API Examples

#### Register User
```bash
POST /api/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "+84912345678",
  "homeAddress": "123 Main Street",
  "bio": "Professional driver"
}
```

#### Get User
```bash
GET /api/users/{userId}
```

#### Get User Profile
```bash
GET /api/users/profile/{userId}
```

#### Update Profile
```bash
PUT /api/users/profile/{userId}
Content-Type: application/json

{
  "bio": "Updated bio",
  "dateOfBirth": "1990-05-15",
  "gender": "MALE",
  "homeAddress": "456 New Street"
}
```

#### Verify Phone
```bash
POST /api/users/profile/{userId}/verify-phone
```

#### Verify Email
```bash
POST /api/users/profile/{userId}/verify-email
```

## Project Structure

```
src/
├── models/             # Database models (User, Profile)
├── services/           # Business logic (UserService, ProfileService)
├── controllers/        # Request handlers
├── routes/             # API routes with Swagger JSDoc
├── config/
│   ├── swagger.js     # Swagger configuration
│   └── app.config.js  # Application config
├── utils/              # Utility functions
├── constants/          # Global constants
└── server.js          # Express server setup
```

## Environment Variables

```env
PORT=5003
DATABASE_URL=postgresql://user:password@localhost:5432/user_service
NODE_ENV=development
```

## Scripts

```bash
npm run dev        # Start development server with nodemon
npm start          # Start production server
npm test           # Run tests
npx prisma studio # Open Prisma Studio GUI
npx prisma migrate dev  # Run database migrations
```

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user |
| GET | `/api/users/{userId}` | Get user details |
| GET | `/api/users` | Get all users (paginated) |
| GET | `/api/users/phone/{phone}` | Get user by phone |
| PUT | `/api/users/{userId}` | Update user info |
| DELETE | `/api/users/{userId}` | Delete user |
| GET | `/api/users/profile/{userId}` | Get user profile |
| PUT | `/api/users/profile/{userId}` | Update profile |
| PUT | `/api/users/profile/{userId}/notifications` | Update notification settings |
| POST | `/api/users/profile/{userId}/verify-phone` | Verify phone |
| POST | `/api/users/profile/{userId}/verify-email` | Verify email |
| GET | `/api/users/profile/{userId}/stats` | Get user statistics |
| GET | `/health` | Health check |

## Testing

Visit the Swagger UI at `http://localhost:5003/api-docs` to test all endpoints interactively.

## Features

- User registration with auto-generated profile
- Profile management (bio, address, contact info)
- Phone and email verification
- Ride statistics tracking
- Account activation/deactivation
- User blocking functionality
- Notification preferences management
- Date of birth handling with automatic conversion
- Complete audit trail with timestamps

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Contributing

Follow the existing code structure and patterns when adding new features. Update Swagger documentation in routes before committing.

## Support

For issues or questions, contact the development team at dev@cabbooking.com
