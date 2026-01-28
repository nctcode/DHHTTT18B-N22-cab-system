const sequelize = require('../config/database');
const Driver = require('../models/driver.model');
const DriverLocation = require('../models/driverLocation.model');

class NearbyService {
  // Tìm tài xế gần vị trí (sử dụng công thức Haversine)
  async findNearbyDrivers(lat, lng, radius = 5, limit = 10) {
    try {
      // Công thức Haversine tính khoảng cách
      const haversine = `(
        6371 * acos(
          cos(radians(${lat})) 
          * cos(radians(lat)) 
          * cos(radians(lng) - radians(${lng})) 
          + sin(radians(${lat})) 
          * sin(radians(lat))
        )
      )`;
      
      const drivers = await DriverLocation.findAll({
        attributes: [
          'driver_id',
          'lat',
          'lng',
          'updated_at',
          [sequelize.literal(haversine), 'distance']
        ],
        include: [{
          model: Driver,
          as: 'driver',
          where: { status: 'ONLINE' },
          attributes: ['id', 'name', 'vehicle_type', 'rating']
        }],
        having: sequelize.literal(`distance <= ${radius}`),
        order: [['distance', 'ASC']],
        limit
      });
      
      return drivers;
    } catch (error) {
      // Fallback: tìm tài xế đơn giản (mock cho demo)
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock nearby drivers');
        return this.mockNearbyDrivers(lat, lng, limit);
      }
      throw new Error(`Failed to find nearby drivers: ${error.message}`);
    }
  }

  // Mock data cho demo
  async mockNearbyDrivers(lat, lng, limit) {
    const mockDrivers = [
      {
        driver_id: '550e8400-e29b-41d4-a716-446655440000',
        lat: parseFloat(lat) + 0.01,
        lng: parseFloat(lng) + 0.01,
        updated_at: new Date(),
        distance: 1.5,
        driver: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Nguyễn Văn A',
          vehicle_type: 'car',
          rating: 4.8
        }
      },
      {
        driver_id: '550e8400-e29b-41d4-a716-446655440001',
        lat: parseFloat(lat) - 0.02,
        lng: parseFloat(lng) + 0.02,
        updated_at: new Date(),
        distance: 2.8,
        driver: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Trần Thị B',
          vehicle_type: 'bike',
          rating: 4.5
        }
      }
    ];
    
    return mockDrivers.slice(0, limit);
  }
}

module.exports = new NearbyService();