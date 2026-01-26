const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');

describe('Driver Service API Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /drivers', () => {
    it('should create a new driver', async () => {
      const driverData = {
        name: 'Test Driver',
        phone: '0911111111',
        vehicle_type: 'car',
        vehicle_plate: '51A-99999'
      };

      const response = await request(app)
        .post('/drivers')
        .send(driverData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(driverData.name);
      expect(response.body.data.phone).toBe(driverData.phone);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        name: 'T', // Too short
        phone: 'invalid',
        vehicle_plate: '123'
      };

      const response = await request(app)
        .post('/drivers')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /drivers/:id', () => {
    it('should return driver by ID', async () => {
      // First create a driver
      const driverData = {
        name: 'Get Test Driver',
        phone: '0922222222',
        vehicle_type: 'bike',
        vehicle_plate: '51B-88888'
      };

      const createResponse = await request(app)
        .post('/drivers')
        .send(driverData)
        .expect(201);

      const driverId = createResponse.body.data.id;

      // Then get the driver
      const getResponse = await request(app)
        .get(`/drivers/${driverId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe(driverId);
      expect(getResponse.body.data.name).toBe(driverData.name);
    });

    it('should return 404 for non-existent driver', async () => {
      const response = await request(app)
        .get('/drivers/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /drivers/:id/status', () => {
    it('should update driver status', async () => {
      // Create a driver first
      const driverData = {
        name: 'Status Test Driver',
        phone: '0933333333',
        vehicle_type: 'car',
        vehicle_plate: '51C-77777'
      };

      const createResponse = await request(app)
        .post('/drivers')
        .send(driverData)
        .expect(201);

      const driverId = createResponse.body.data.id;

      // Update status
      const updateResponse = await request(app)
        .put(`/drivers/${driverId}/status`)
        .send({ status: 'ONLINE' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.status).toBe('ONLINE');
    });
  });

  describe('GET /locations/nearby', () => {
    it('should find nearby drivers', async () => {
      const response = await request(app)
        .get('/locations/nearby')
        .query({
          lat: 10.7769,
          lng: 106.7009,
          radius: 5,
          limit: 10
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .get('/locations/nearby')
        .query({
          lat: 200, // Invalid latitude
          lng: 106.7009
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Health check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.service).toBe('Driver Service');
      expect(response.body.status).toBe('healthy');
    });
  });
});