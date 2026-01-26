const DriverLocation = require('../models/driverLocation.model');
const Driver = require('../models/driver.model');
const { Op } = require('sequelize');

class LocationService {
  // Cập nhật vị trí tài xế
  async updateDriverLocation(driverId, lat, lng) {
    try {
      const driver = await Driver.findByPk(driverId);
      
      if (!driver) {
        throw new Error('Driver not found');
      }
      
      // Kiểm tra tọa độ hợp lệ
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid coordinates');
      }
      
      // Tìm hoặc tạo vị trí
      const [location, created] = await DriverLocation.findOrCreate({
        where: { driver_id: driverId },
        defaults: {
          driver_id: driverId,
          lat,
          lng
        }
      });
      
      if (!created) {
        await location.update({ lat, lng, updated_at: new Date() });
      }
      
      // Cập nhật trạng thái driver sang ONLINE nếu đang OFFLINE
      if (driver.status === 'OFFLINE') {
        await driver.update({ status: 'ONLINE' });
      }
      
      return location;
    } catch (error) {
      throw new Error(`Failed to update location: ${error.message}`);
    }
  }

  // Lấy vị trí hiện tại của tài xế
  async getDriverLocation(driverId) {
    try {
      const location = await DriverLocation.findOne({
        where: { driver_id: driverId },
        include: [{
          model: Driver,
          as: 'driver',
          attributes: ['id', 'name', 'vehicle_type', 'status']
        }]
      });
      
      if (!location) {
        throw new Error('Location not found');
      }
      
      return location;
    } catch (error) {
      throw new Error(`Failed to get location: ${error.message}`);
    }
  }

  // Lấy lịch sử vị trí (đơn giản)
  async getLocationHistory(driverId, hours = 24) {
    try {
      const timeAgo = new Date();
      timeAgo.setHours(timeAgo.getHours() - hours);
      
      const locations = await DriverLocation.findAll({
        where: {
          driver_id: driverId,
          updated_at: {
            [Op.gte]: timeAgo
          }
        },
        order: [['updated_at', 'DESC']],
        limit: 100
      });
      
      return locations;
    } catch (error) {
      throw new Error(`Failed to get location history: ${error.message}`);
    }
  }
}

module.exports = new LocationService();