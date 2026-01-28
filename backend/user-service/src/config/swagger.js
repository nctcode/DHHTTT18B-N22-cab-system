const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Service API',
      version: '1.0.0',
      description: 'User management service for cab booking system',
      contact: {
        name: 'Development Team',
        email: 'dev@cabbooking.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5003',
        description: 'Development Server'
      },
      {
        url: 'http://localhost:3003',
        description: 'Alternative Development Server'
      }
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            avatar: {
              type: 'string',
              nullable: true,
              description: 'Avatar URL'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['id', 'name', 'phone', 'createdAt']
        },
        Profile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            userId: {
              type: 'string',
              format: 'uuid'
            },
            bio: {
              type: 'string',
              nullable: true
            },
            dateOfBirth: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            gender: {
              type: 'string',
              enum: ['MALE', 'FEMALE', 'OTHER'],
              nullable: true
            },
            address: {
              type: 'string',
              nullable: true
            },
            city: {
              type: 'string',
              nullable: true
            },
            state: {
              type: 'string',
              nullable: true
            },
            zipCode: {
              type: 'string',
              nullable: true
            },
            country: {
              type: 'string',
              nullable: true
            },
            homeAddress: {
              type: 'string',
              nullable: true
            },
            workAddress: {
              type: 'string',
              nullable: true
            },
            rideCount: {
              type: 'integer',
              default: 0
            },
            totalSpent: {
              type: 'number',
              format: 'double',
              default: 0
            },
            averageRating: {
              type: 'number',
              format: 'double',
              default: 5.0
            },
            isVerified: {
              type: 'boolean',
              default: false
            },
            isPhoneVerified: {
              type: 'boolean',
              default: false
            },
            isEmailVerified: {
              type: 'boolean',
              default: false
            },
            isActive: {
              type: 'boolean',
              default: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            message: {
              type: 'string'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Profiles',
        description: 'User profile operations'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
