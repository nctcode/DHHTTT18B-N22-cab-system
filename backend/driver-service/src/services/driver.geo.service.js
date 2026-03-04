// src/services/driver.geo.service.js
const { getRedisClient, isRedisConnected } = require('../config/redis');

const DRIVERS_GEO_KEY = 'drivers:locations';

/**
 * Update driver's GPS location in Redis Geo
 * @param {string} driverId - Driver ID
 * @param {number} longitude - Longitude coordinate
 * @param {number} latitude - Latitude coordinate
 * @returns {Promise<boolean>} Success status
 */
const updateDriverLocation = async (driverId, longitude, latitude) => {
  if (!isRedisConnected()) {
    console.warn('Redis not connected, skipping location update');
    return false;
  }

  try {
    const client = getRedisClient();
    
    // GEOADD key longitude latitude member
    // Redis Geo stores locations as (longitude, latitude) - note the order!
    await client.geoAdd(DRIVERS_GEO_KEY, {
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude),
      member: `driver:${driverId}`
    });

    // Also store last update timestamp
    await client.hSet(`driver:${driverId}:meta`, {
      lastUpdate: new Date().toISOString(),
      latitude: latitude.toString(),
      longitude: longitude.toString()
    });

    console.log(`📍 Updated location for driver ${driverId}: (${latitude}, ${longitude})`);
    return true;
  } catch (error) {
    console.error('Error updating driver location:', error);
    return false;
  }
};

/**
 * Get nearby drivers within a radius
 * @param {number} longitude - Center longitude
 * @param {number} latitude - Center latitude
 * @param {number} radiusKm - Radius in kilometers
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of nearby drivers with distances
 */
const getNearbyDrivers = async (longitude, latitude, radiusKm = 10, limit = 10) => {
  if (!isRedisConnected()) {
    console.warn('Redis not connected, returning empty results');
    return [];
  }

  try {
    const client = getRedisClient();
    
    // GEORADIUS key longitude latitude radius km WITHCOORD WITHDIST
    const results = await client.geoRadius(
      DRIVERS_GEO_KEY,
      {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude)
      },
      radiusKm,
      'km',
      {
        WITHCOORD: true,
        WITHDIST: true,
        COUNT: limit
      }
    );

    // Transform results to usable format
    const drivers = results.map(result => ({
      driverId: result.member.replace('driver:', ''),
      distance: parseFloat(result.distance),
      coordinates: {
        longitude: result.coordinates.longitude,
        latitude: result.coordinates.latitude
      }
    }));

    console.log(`🔍 Found ${drivers.length} drivers within ${radiusKm}km of (${latitude}, ${longitude})`);
    return drivers;
  } catch (error) {
    console.error('Error getting nearby drivers:', error);
    return [];
  }
};

/**
 * Get specific driver's current location
 * @param {string} driverId - Driver ID
 * @returns {Promise<Object|null>} Driver location or null
 */
const getDriverLocation = async (driverId) => {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    const client = getRedisClient();
    
    // GEOPOS key member
    const positions = await client.geoPos(DRIVERS_GEO_KEY, `driver:${driverId}`);
    
    if (!positions || positions.length === 0 || !positions[0]) {
      return null;
    }

    const meta = await client.hGetAll(`driver:${driverId}:meta`);

    return {
      driverId,
      coordinates: {
        longitude: positions[0].longitude,
        latitude: positions[0].latitude
      },
      lastUpdate: meta.lastUpdate || null
    };
  } catch (error) {
    console.error('Error getting driver location:', error);
    return null;
  }
};

/**
 * Remove driver from geo index (when going offline)
 * @param {string} driverId - Driver ID
 * @returns {Promise<boolean>} Success status
 */
const removeDriverLocation = async (driverId) => {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    const client = getRedisClient();
    
    await client.zRem(DRIVERS_GEO_KEY, `driver:${driverId}`);
    await client.del(`driver:${driverId}:meta`);
    
    console.log(`🗑️ Removed location for driver ${driverId}`);
    return true;
  } catch (error) {
    console.error('Error removing driver location:', error);
    return false;
  }
};

module.exports = {
  updateDriverLocation,
  getNearbyDrivers,
  getDriverLocation,
  removeDriverLocation
};
