const redis = require('../config/redis');
const defaults = require('../data/defaults.json');

const DRIVER_PREFIX = 'features:driver:';
const ZONE_PREFIX = 'features:zone:';
const ZONE_HISTORY_PREFIX = 'features:zone_history:';
const TTL = 3600; // 1 hour
const HISTORY_TTL = 7 * 24 * 3600; // 7 days
const MAX_HISTORY_POINTS = 500;

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

  async appendZoneDemandHistory(zoneId, demandValue, source = 'update') {
    if (!Number.isFinite(Number(demandValue))) return;

    const point = {
      timestamp: new Date().toISOString(),
      value: Number(demandValue),
      source,
    };

    const historyKey = `${ZONE_HISTORY_PREFIX}${zoneId}`;
    await redis.lpush(historyKey, JSON.stringify(point));
    await redis.ltrim(historyKey, 0, MAX_HISTORY_POINTS - 1);
    await redis.expire(historyKey, HISTORY_TTL);
  }

  async getZoneDemandHistory(zoneId, limit = 24) {
    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), MAX_HISTORY_POINTS)
      : 24;

    const historyKey = `${ZONE_HISTORY_PREFIX}${zoneId}`;
    const raw = await redis.lrange(historyKey, 0, safeLimit - 1);

    const points = raw
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch (_e) {
          return null;
        }
      })
      .filter(Boolean)
      .reverse(); // oldest -> newest

    return points;
  }

  async updateZoneFeatures(zoneId, features, historySource = 'manual_update') {
    const current = await this.getZoneFeatures(zoneId);
    const updated = { ...current, ...features, zoneId, updatedAt: new Date().toISOString() };
    await redis.setex(`${ZONE_PREFIX}${zoneId}`, TTL, JSON.stringify(updated));

    const previousDemand = Number(current?.demandCount);
    const nextDemand = Number(updated?.demandCount);
    const demandChanged = Number.isFinite(nextDemand) && nextDemand !== previousDemand;

    if (demandChanged || historySource === 'increment_demand') {
      await this.appendZoneDemandHistory(zoneId, nextDemand, historySource);
    }

    return updated;
  }

  async incrementZoneDemand(zoneId) {
    const zone = await this.getZoneFeatures(zoneId);
    zone.demandCount = (zone.demandCount || 0) + 1;
    return this.updateZoneFeatures(zoneId, zone, 'increment_demand');
  }

  async incrementZoneSupply(zoneId) {
    const zone = await this.getZoneFeatures(zoneId);
    zone.supplyCount = (zone.supplyCount || 0) + 1;
    return this.updateZoneFeatures(zoneId, zone, 'increment_supply');
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
