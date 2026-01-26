const { v4: uuidv4 } = require('uuid');
const Driver = require('../models/driver.model');
const DriverLocation = require('../models/driverLocation.model');

class DriverService {
  // Tạo tài xế mới
  async createDriver(driverData) {
    try {
      const driver = await Driver.create({
        id: uuidv4(),
        ...driverData
      });
      return driver;
    } catch (error) {
      throw new Error(`Failed to create driver: ${error.message}`);
    }
  }

  // Lấy thông tin tài xế theo ID
  async getDriverById(driverId) {
    try {
      const driver = await Driver.findByPk(driverId, {
        include: [{
          model: DriverLocation,
          as: 'location',
          attributes: ['lat', 'lng', 'updated_at']
        }]
      });
      
      if (!driver) {
        throw new Error('Driver not found');
      }
      
      return driver;
    } catch (error) {
      throw new Error(`Failed to get driver: ${error.message}`);
    }
  }

  // Cập nhật thông tin tài xế
  async updateDriver(driverId, updateData) {
    try {
      const driver = await Driver.findByPk(driverId);
      
      if (!driver) {
        throw new Error('Driver not found');
      }
      
      await driver.update(updateData);
      return driver;
    } catch (error) {
      throw new Error(`Failed to update driver: ${error.message}`);
    }
  }

  // Cập nhật trạng thái tài xế
  async updateDriverStatus(driverId, status) {
    try {
      const validStatuses = ['ONLINE', 'OFFLINE', 'BUSY'];
      
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }
      
      const driver = await Driver.findByPk(driverId);
      
      if (!driver) {
        throw new Error('Driver not found');
      }
      
      await driver.update({ status });
      return driver;
    } catch (error) {
      throw new Error(`Failed to update driver status: ${error.message}`);
    }
  }

  // Xóa tài xế (soft delete)
  async deleteDriver(driverId) {
    try {
      const driver = await Driver.findByPk(driverId);
      
      if (!driver) {
        throw new Error('Driver not found');
      }
      
      await driver.destroy();
      return { message: 'Driver deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete driver: ${error.message}`);
    }
  }

  // Lấy danh sách tất cả tài xế
  async getAllDrivers(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const { count, rows } = await Driver.findAndCountAll({
        include: [{
          model: DriverLocation,
          as: 'location',
          attributes: ['lat', 'lng']
        }],
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });
      
      return {
        drivers: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get drivers: ${error.message}`);
    }
  }
}

module.exports = new DriverService();