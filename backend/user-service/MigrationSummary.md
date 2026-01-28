# User Service Migration Summary

## What Changed

### 1. Database Schema Restructured
- **Old**: Complex multi-table setup (Customer, UserProfile, PaymentMethod, FavoriteLocation, RideHistory)
- **New**: Simplified two-table structure (user_db, profile)
  - `user_db`: Core user information (id, name, phone, avatar, created_at)
  - `profile`: Extended profile with ride stats and preferences (userId, bio, address, rideCount, etc.)

### 2. Code Refactoring
- Deleted old files:
  - `/models/Customer.js` → replaced with `/models/User.js`
  - `/services/customer.service.js` → removed
  - `/controllers/customer.controller.js` → replaced with `/controllers/user.controller.js`

- New files created:
  - `/models/User.js` - User database operations
  - `/models/Profile.js` - Profile database operations (simplified)
  - `/services/user.service.js` - User business logic
  - `/controllers/user.controller.js` - User request handlers
  - `/config/swagger.js` - Swagger/OpenAPI configuration

- Updated files:
  - `/routes/user.routes.js` - Added Swagger JSDoc annotations
  - `/src/server.js` - Added Swagger UI integration
  - `/package.json` - Added swagger-ui-express and swagger-jsdoc

### 3. API Changes

#### New Endpoints
All endpoints now follow cleaner naming:
- `POST /api/users/register` - Register new user
- `GET /api/users/{userId}` - Get user
- `PUT /api/users/{userId}` - Update user
- `GET /api/users/profile/{userId}` - Get profile
- `PUT /api/users/profile/{userId}` - Update profile

#### Removed Complexity
- No more separate customer registration and profile creation
- No more complex multi-table queries
- Auto-profile creation on user registration

### 4. Swagger Documentation
- Added interactive API documentation at `http://localhost:5003/api-docs`
- All endpoints documented with request/response schemas
- Swagger UI powered by swagger-ui-express
- JSDoc annotations in routes for live API docs

### 5. Cleaned Up Documentation
- Deleted old README files:
  - SETUP.md
  - TESTING_GUIDE.md
  - QUICK_FIX.md
  - API_ENDPOINTS.md
  - FIXED_TEST.md

- New single source of truth:
  - README.md - Complete guide with all info
  - MIGRATION_SUMMARY.md - This file (changes overview)

## Migration Steps for Running

```bash
# 1. Update dependencies
cd backend/user-service
npm install

# 2. Reset database (WARNING: deletes all data)
npx prisma migrate reset

# 3. Generate Prisma client
npx prisma generate

# 4. Start service
npm run dev
```

Service will be available at:
- Main API: `http://localhost:5003/api/users`
- Swagger Docs: `http://localhost:5003/api-docs`
- Health Check: `http://localhost:5003/health`

## Testing

Use Swagger UI to test all endpoints without Postman:
1. Open `http://localhost:5003/api-docs`
2. Click on any endpoint to expand it
3. Click "Try it out"
4. Fill in parameters and request body
5. Click "Execute" to see response

## Key Improvements

1. **Simplified Architecture**: Reduced from 5+ tables to 2 tables
2. **Cleaner API**: More intuitive endpoint naming
3. **Better Documentation**: Interactive Swagger UI instead of static docs
4. **Easier Testing**: Test directly from browser without external tools
5. **Auto-relationships**: Profile auto-created with user
6. **Type Safety**: Prisma schema ensures data consistency

## Backwards Compatibility

⚠️ This is a breaking change. Old API endpoints no longer exist.

Update API clients to use:
- Old: `POST /customers/register/:userId`
- New: `POST /api/users/register`

- Old: `GET /customers/:customerId`
- New: `GET /api/users/:userId`

- Old: `GET /profiles/:userId`
- New: `GET /api/users/profile/:userId`

## Notes

- All date fields (dateOfBirth) are automatically converted from YYYY-MM-DD to DateTime
- Phone numbers are validated as mobile phones
- Passwords are not stored (handled by auth-service)
- Profile auto-creates with user registration
- All timestamps use UTC

