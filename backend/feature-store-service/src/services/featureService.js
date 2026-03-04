const redis = require('../config/redis');
const defaults = require('../data/defaults.json');

const DRIVER_PREFIX = 'features:driver:';
const ZONE_PREFIX = 'features:zone:';
const TTL = 3600; // 1 hour

class FeatureService {

  // ── Driver Features ──

  async getDriverFeatures(driverId) {
    const cached = await redis.get(`${DRIVER_PREFIX}${driverId}`);
    if (cached) return JSON.parse(cached);
    return { driverId, ...defaults.driverDefaults };
  }

  async updateDriverFeatures(driverId, features) {
    const current = await this.getDriverFeatures(driverId);
    const updated = { ...current, ...features, driverId, updatedAt: new Date().toISOString() };
    await redis.setex(`${DRIVER_PREFIX}${driverId}`, TTL, JSON.stringify(updated));
    return updated;
  }

  // ── Zone Features ──

  async getZoneFeatures(zoneId) {
    const cached = await redis.get(`${ZONE_PREFIX}${zoneId}`);
    if (cached) return JSON.parse(cached);
    return { zoneId, ...defaults.zoneDefaults };
  }

  async updateZoneFeatures(zoneId, features) {
    const current = await this.getZoneFeatures(zoneId);
    const updated = { ...current, ...features, zoneId, updatedAt: new Date().toISOString() };
    await redis.setex(`${ZONE_PREFIX}${zoneId}`, TTL, JSON.stringify(updated));
    return updated;
  }

  async incrementZoneDemand(zoneId) {
    const zone = await this.getZoneFeatures(zoneId);
    zone.demandCount = (zone.demandCount || 0) + 1;
    return this.updateZoneFeatures(zoneId, zone);
  }

  async incrementZoneSupply(zoneId) {
    const zone = await this.getZoneFeatures(zoneId);
    zone.supplyCount = (zone.supplyCount || 0) + 1;
    return this.updateZoneFeatures(zoneId, zone);
  }

  // ── Trip Context ──

  getTripContext() {
    return defaults.tripContext;
  }

  // ── Vehicle Config ──

  getVehicleConfig(vehicleType) {
    return defaults.vehicleConfig[vehicleType] || defaults.vehicleConfig.ECONOMY;
  }

  getAllVehicleConfigs() {
    return defaults.vehicleConfig;
  }
}

module.exports = new FeatureService();
