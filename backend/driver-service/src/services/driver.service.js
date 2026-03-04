const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DriverService {
    /**
     * Create driver profile
     */
    static async createDriver(data) {
      const { user_id, vehicle_type, vehicle_plate, current_lat, current_lng } = data;
  
      // Check if driver already exists for this user
      const existingDriver = await prisma.driver.findFirst({
        where: { user_id }
      });
  
      if (existingDriver) {
        const error = new Error('Driver profile already exists');
        error.statusCode = 409;
        throw error;
      }
  
      return await prisma.driver.create({
        data: {
          user_id,
          vehicle_type,
          vehicle_plate,
          current_lat: parseFloat(current_lat),
          current_lng: parseFloat(current_lng),
          is_available: false, // Default
          rating_avg: 5.0      // Default
        }
      });
    }
  
    /**
     * Get driver by ID
     */
    static async getDriverById(driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId }
      });
  
      if (!driver) {
        const error = new Error('Driver not found');
        error.statusCode = 404;
        throw error;
      }
  
      return driver;
    }

    /**
     * Get driver by user_id (auth user ID)
     */
    static async getDriverByUserId(userId) {
      const driver = await prisma.driver.findFirst({
        where: { user_id: userId }
      });
  
      if (!driver) {
        const error = new Error('Driver not found');
        error.statusCode = 404;
        throw error;
      }
  
      return driver;
    }
  
    /**
     * Update driver info
     */
    static async updateDriver(driverId, updateData) {
      // Only allow updating vehicle info, not sensitive fields like user_id or rating
      const allowedUpdates = {};
      if (updateData.vehicle_type) allowedUpdates.vehicle_type = updateData.vehicle_type;
      if (updateData.vehicle_plate) allowedUpdates.vehicle_plate = updateData.vehicle_plate;
  
      // Check existence
      const existingDriver = await prisma.driver.findUnique({
        where: { id: driverId }
      });
  
      if (!existingDriver) {
        const error = new Error('Driver not found');
        error.statusCode = 404;
        throw error;
      }
  
      return await prisma.driver.update({
        where: { id: driverId },
        data: allowedUpdates
      });
    }
  
    /**
     * Update driver status (availability)
     */
    static async updateStatus(driverId, isAvailable) {
      // Check existence
      const existingDriver = await prisma.driver.findUnique({
        where: { id: driverId }
      });
  
      if (!existingDriver) {
        const error = new Error('Driver not found');
        error.statusCode = 404;
        throw error;
      }
  
      return await prisma.driver.update({
        where: { id: driverId },
        data: { is_available: isAvailable }
      });
    }
  
    /**
     * Update driver location
     */
    static async updateLocation(driverId, lat, lng) {
        // Check existence
        const existingDriver = await prisma.driver.findUnique({
          where: { id: driverId }
        });
    
        if (!existingDriver) {
          const error = new Error('Driver not found');
          error.statusCode = 404;
          throw error;
        }
    
        return await prisma.driver.update({
          where: { id: driverId },
          data: {
              current_lat: parseFloat(lat),
              current_lng: parseFloat(lng)
          }
        });
    }
  
    /**
     * Get all drivers (Admin)
     */
    static async getAllDrivers(skip = 0, take = 10) {
      const [drivers, total] = await Promise.all([
        prisma.driver.findMany({
          skip,
          take,
          orderBy: { created_at: 'desc' }
        }),
        prisma.driver.count()
      ]);
  
      return {
        data: drivers,
        total,
        skip,
        take
      };
    }
  
    /**
     * Get available drivers
     */
    static async getAvailableDrivers() {
      const drivers = await prisma.driver.findMany({
        where: { is_available: true }
      });
      console.log(`[Driver Service] Found ${drivers.length} available drivers`);
      if (drivers.length > 0) {
          console.log(`[Driver Service] Sample driver: ${JSON.stringify(drivers[0])}`);
      }
      return drivers;
    }

    /**
     * Get nearby online drivers sorted by distance ASC, rating DESC
     * Uses Haversine formula via raw SQL
     */
    static async getNearbyOnlineDrivers(lat, lng, radiusKm = 10, limit = 20) {
      const drivers = await prisma.$queryRaw`
        SELECT * FROM (
          SELECT 
            id, user_id, vehicle_type, vehicle_plate, rating_avg,
            current_lat, current_lng,
            (
              6371 * acos(
                LEAST(1.0, cos(radians(${lat}::float))
                * cos(radians(current_lat))
                * cos(radians(current_lng) - radians(${lng}::float))
                + sin(radians(${lat}::float))
                * sin(radians(current_lat)))
              )
            ) AS distance_km
          FROM drivers
          WHERE is_available = true
            AND current_lat IS NOT NULL
            AND current_lng IS NOT NULL
            AND updated_at >= NOW() - INTERVAL '1 MINUTE'
        ) AS nearby
        WHERE distance_km <= ${radiusKm}::float
        ORDER BY distance_km ASC, rating_avg DESC
        LIMIT ${limit}::int
      `;
      console.log(`[Driver Service] Found ${drivers.length} nearby online drivers within ${radiusKm}km`);
      return drivers.map(d => ({
        id: d.id,
        user_id: d.user_id,
        vehicle_type: d.vehicle_type,
        vehicle_plate: d.vehicle_plate,
        rating_avg: parseFloat(d.rating_avg),
        current_lat: parseFloat(d.current_lat),
        current_lng: parseFloat(d.current_lng),
        distance_km: parseFloat(d.distance_km),
      }));
    }
  
    /**
     * Delete driver (Admin - Soft Delete optional or hard delete?)
     */
    static async deleteDriver(driverId) {
      const existingDriver = await prisma.driver.findUnique({
          where: { id: driverId }
      });
  
      if (!existingDriver) {
          const error = new Error('Driver not found');
          error.statusCode = 404;
          throw error;
      }
  
      return await prisma.driver.delete({
          where: { id: driverId }
      });
    }
  }
  
  module.exports = DriverService;