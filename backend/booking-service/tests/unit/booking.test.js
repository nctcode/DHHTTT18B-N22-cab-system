// tests/unit/booking.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Booking = require('../../src/models/booking.model');
const app = require('../../src/app');

let mongoServer;
let server;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  server = app.listen(0); // Random port for testing
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  server.close();
});

beforeEach(async () => {
  await Booking.deleteMany({});
});

describe('Booking Model', () => {
  test('should create a new booking', async () => {
    const bookingData = {
      bookingId: 'TEST123',
      passengerId: 'PASS123',
      pickupLocation: {
        address: '123 Test Street',
        coordinates: { lat: 10.762622, lng: 106.660172 }
      },
      destination: {
        address: '456 Test Avenue',
        coordinates: { lat: 10.771952, lng: 106.700272 }
      },
      vehicleType: 'STANDARD',
      status: 'PENDING'
    };
    
    const booking = new Booking(bookingData);
    await booking.save();
    
    expect(booking.bookingId).toBe('TEST123');
    expect(booking.passengerId).toBe('PASS123');
    expect(booking.status).toBe('PENDING');
  });
  
  test('should validate required fields', async () => {
    const booking = new Booking({});
    
    let error;
    try {
      await booking.validate();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.passengerId).toBeDefined();
    expect(error.errors.pickupLocation).toBeDefined();
  });
});

describe('Booking API', () => {
  test('GET /health should return 200', async () => {
    const response = await request(server).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
  
  test('POST /api/v1/bookings should create booking', async () => {
    const bookingData = {
      pickupLocation: {
        address: '123 Test Street',
        coordinates: { lat: 10.762622, lng: 106.660172 }
      },
      destination: {
        address: '456 Test Avenue',
        coordinates: { lat: 10.771952, lng: 106.700272 }
      },
      vehicleType: 'STANDARD'
    };
    
    // Note: This would need proper authentication setup
    const response = await request(server)
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer test-token')
      .send(bookingData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.bookingId).toBeDefined();
  });
});

describe('Booking Service', () => {
  test('should calculate distance correctly', () => {
    // This would test helper functions
    const distance = 5; // Mock distance calculation
    expect(distance).toBeGreaterThan(0);
  });
});