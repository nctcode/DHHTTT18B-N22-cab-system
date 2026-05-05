const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./app.config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cab Booking System API',
      version: '1.0.0',
      description: 'API Gateway for Cab Booking Microservices System',
      contact: {
        name: 'API Support',
        email: 'support@cabbooking.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: `http://localhost:${config.port}/api`,
        description: 'Development API base path',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-User-Id',
          description: 'For testing without JWT'
        }
      },
      schemas: {
        // Location Schema (Embedded in Booking/Ride)
        Location: {
          type: 'object',
          required: ['lat', 'lng', 'address'],
          properties: {
            lat: { type: 'number', format: 'double', example: 10.762622 },
            lng: { type: 'number', format: 'double', example: 106.660172 },
            address: { type: 'string', example: 'Quận 1, TP.HCM' },
          },
        },
        
        // User Schema (Updated)
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            fullName: { type: 'string', example: 'Nguyễn Văn A' },
            phone: { type: 'string', example: '0901234567' },
            email: { type: 'string', format: 'email', example: 'nguyenvana@example.com', nullable: true },
            role: { type: 'string', enum: ['PASSENGER', 'DRIVER', 'ADMIN'], example: 'PASSENGER' },
            avatarUrl: { type: 'string', format: 'uri', nullable: true, example: 'https://example.com/avatar.jpg' },
            ratingAvg: { type: 'number', format: 'float', example: 4.8 },
            ratingCount: { type: 'integer', example: 25 },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
          },
        },
        
        // User Address Schema (NEW)
        UserAddress: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            label: { type: 'string', example: 'Nhà' },
            address: { type: 'string', example: '123 Nguyễn Huệ, Q1, TP.HCM' },
            lat: { type: 'number', format: 'double' },
            lng: { type: 'number', format: 'double' },
            isDefault: { type: 'boolean' },
          },
        },
        
        // Booking Schema (Updated)
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            passengerId: { type: 'string', format: 'uuid', example: 'user_123456789' },
            pickup: { $ref: '#/components/schemas/Location' },
            dropoff: { $ref: '#/components/schemas/Location' },
            vehicleType: { type: 'string', enum: ['BIKE', 'CAR'], example: 'CAR' },
            estimatedPrice: { type: 'number', format: 'float', example: 50000 },
            surgeMultiplier: { type: 'number', default: 1.0 },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'], example: 'PENDING' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
          },
        },
        
        // Driver Schema (Updated)
        Driver: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'driver_123456789' },
            userId: { type: 'string', format: 'uuid', description: 'Soft reference to User Service' },
            name: { type: 'string', example: 'Lê Văn C' },
            phone: { type: 'string', example: '0912345678' },
            licenseNumber: { type: 'string', example: 'B2-12345678' },
            vehicleType: { type: 'string', enum: ['BIKE', 'CAR'], example: 'CAR' },
            vehiclePlate: { type: 'string', example: '51G-12345' },
            status: { type: 'string', enum: ['ONLINE', 'OFFLINE', 'BUSY'], example: 'ONLINE' },
            ratingAvg: { type: 'number', format: 'float', example: 4.7 },
            ratingCount: { type: 'integer', example: 120 },
            verified: { type: 'boolean', example: true },
            currentRideId: { type: 'string', nullable: true },
          },
        },
        
        // Ride Schema (Updated - MongoDB ObjectId)
        Ride: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'MongoDB ObjectId (24 hex)', example: '507f1f77bcf86cd799439011' },
            bookingId: { type: 'string', example: '507f1f77bcf86cd799439012' },
            passengerId: { type: 'string', format: 'uuid', example: '3ee214e6-a016-4a37-924b-fee4b2861223' },
            driverId: { type: 'string', format: 'uuid', nullable: true, example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            pickup: { $ref: '#/components/schemas/Location' },
            dropoff: { $ref: '#/components/schemas/Location' },
            vehicleType: { type: 'string', enum: ['BIKE', 'CAR'], example: 'CAR' },
            status: { type: 'string', enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], example: 'PENDING' },
            actualDistanceKm: { type: 'number', format: 'float', nullable: true },
            actualDurationMin: { type: 'integer', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        
        // Payment Schema (Updated)
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'payment_123456789' },
            rideId: { type: 'string', description: 'MongoDB ObjectId', example: '507f1f77bcf86cd799439011' },
            passengerId: { type: 'string', format: 'uuid' },
            amount: { type: 'number', format: 'decimal', example: 50000 },
            method: { type: 'string', enum: ['CASH', 'CREDIT_CARD', 'E_WALLET', 'BANK_ACCOUNT'], example: 'CASH' },
            status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'], example: 'COMPLETED' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        
        // Pricing Calculation Response (NEW)
        PriceResponse: {
          type: 'object',
          properties: {
            basePrice: { type: 'number' },
            distancePrice: { type: 'number' },
            timePrice: { type: 'number' },
            subtotal: { type: 'number' },
            minFare: { type: 'number' },
            finalPrice: { type: 'number' },
            surgeMultiplier: { type: 'number' },
            surgeZone: {
              type: 'object',
              nullable: true,
              properties: {
                name: { type: 'string' },
                multiplier: { type: 'number' },
              },
            },
            currency: { type: 'string', example: 'VND' },
          },
        },
        
        // Auth Response
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Login successful',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
          },
        },
        
        // Pagination Schema
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 20,
            },
            total: {
              type: 'integer',
              example: 100,
            },
            pages: {
              type: 'integer',
              example: 5,
            },
          },
        },
        
        // Error Schema
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            error: {
              type: 'string',
              example: 'Detailed error message',
            },
            statusCode: {
              type: 'integer',
              example: 400,
            },
          },
        },
        
        // Success Schema
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
      },
      
      // Common parameters
      parameters: {
        userIdParam: {
          name: 'userId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'User ID',
        },
        bookingIdParam: {
          name: 'bookingId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'Booking ID',
        },
        driverIdParam: {
          name: 'driverId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'Driver ID',
        },
        pageParam: {
          name: 'page',
          in: 'query',
          schema: {
            type: 'integer',
            default: 1,
            minimum: 1,
          },
          description: 'Page number',
        },
        limitParam: {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            default: 20,
            maximum: 100,
          },
          description: 'Items per page (max 100)',
        },
      },
      
      // Common responses
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Authentication required',
                statusCode: 401,
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Resource not found',
                statusCode: 404,
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Validation failed',
                error: 'Pickup location is required',
                statusCode: 400,
              },
            },
          },
        },
      },
    },
    
    // Tags cho tất cả services
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'Bookings',
        description: 'Booking management operations',
      },
      {
        name: 'Drivers',
        description: 'Driver management operations',
      },
      {
        name: 'Rides',
        description: 'Ride management operations',
      },
      {
        name: 'Payments',
        description: 'Payment processing operations',
      },
      {
        name: 'Pricing',
        description: 'Pricing and fare calculation',
      },
      {
        name: 'Notifications',
        description: 'Notification management',
      },
      {
        name: 'Reviews',
        description: 'Review and rating management',
      },
      {
        name: 'AI',
        description: 'AI & Big Data Analytics operations (Matching, Recommendation, Forecasting)',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
  },
  
  // Đọc từ tất cả các file YAML trong thư mục swagger
  apis: [
    './src/swagger/*.yaml',           // File YAML riêng cho từng service
    './src/swagger/**/*.yaml',        // File YAML trong subdirectories
    './src/routes/*.js',              // JS files có JSDoc comments
    './src/controllers/*.js',         // Controller files
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;