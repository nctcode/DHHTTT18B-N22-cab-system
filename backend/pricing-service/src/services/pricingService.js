const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redisAdapter = require('../adapters/redis.adapter');
const axios = require('axios');

const AI_SURGE_URL = process.env.AI_SURGE_URL || 'http://localhost:4003';

class PricingService {

  /**
   * GET /pricing/estimate
   * Calculate fare estimate with AI-driven surge applied.
   * 
   * @param {Object} data { zoneId, distance_km, duration_min, vehicle_type }
   * @returns {Object} Detailed fare breakdown
   */
  async estimate(data) {
    const { zoneId, distance_km, duration_min, vehicle_type } = data;

    if (!distance_km || distance_km <= 0) throw new Error('distance_km must be > 0');
    if (!vehicle_type) throw new Error('vehicle_type is required');

    // 1. Fetch PricingRule from PostgreSQL
    const rule = await prisma.pricingRule.findFirst({
      where: { vehicle_type }
    });

    if (!rule) throw new Error(`No pricing rule found for vehicle type: ${vehicle_type}`);

    // 2. Get surge multiplier — prefer AI Surge Service, fallback to Redis
    let surgeMultiplier = 1.0;
    let surgeVersion = 0;
    let surgeSource = 'none';

    // Try AI Surge Service first
    try {
      const now = new Date();
      const surgeResp = await axios.post(`${AI_SURGE_URL}/ai/surge/predict`, {
        zoneId: zoneId || 'default',
        timeOfDay: now.getHours(),
        dayOfWeek: now.getDay(),
        specialEvent: false,
      }, { timeout: 3000 });

      const prediction = surgeResp.data?.data;
      if (prediction?.surgeMultiplier) {
        surgeMultiplier = prediction.surgeMultiplier;
        surgeSource = 'ai_model';
        console.log(`⚡ AI Surge: ${prediction.surgeLevel} (${surgeMultiplier}x)`);
      }
    } catch (err) {
      console.warn('AI Surge unavailable, falling back to Redis:', err.message);

      // Fallback: Redis surge cache
      if (zoneId) {
        const surgeData = await redisAdapter.safeGetSurge(zoneId);
        surgeMultiplier = surgeData.multiplier || 1.0;
        surgeVersion = surgeData.version || 0;
        surgeSource = 'redis_cache';
      }
    }


    // 3. Calculate fare
    const baseFare = rule.base_fare;
    const distanceFare = rule.price_per_km * distance_km;
    const timeFare = rule.price_per_min * (duration_min || 0);
    const subtotal = baseFare + distanceFare + timeFare;
    const totalFare = Math.round(subtotal * surgeMultiplier);

    return {
      baseFare,
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      surgeMultiplier,
      surgeVersion, // For snapshot consistency
      totalFare,
      currency: 'VND',
      breakdown: {
        vehicle_type,
        distance_km,
        duration_min: duration_min || 0,
        base_fare: baseFare,
        price_per_km: rule.price_per_km,
        price_per_min: rule.price_per_min,
        surgeApplied: surgeMultiplier > 1.0
      }
    };
  }

  /**
   * Get all active surge zones with their current Redis-cached multiplier
   */
  async getActiveSurgeZones() {
    const zones = await prisma.surgeZone.findMany({ where: { active: true } });
    
    // Enrich with live Redis multiplier
    const enriched = [];
    for (const zone of zones) {
      const surgeData = await redisAdapter.safeGetSurge(zone.id);
      enriched.push({
        id: zone.id,
        area_name: zone.area_name,
        configMultiplier: zone.multiplier, // DB config
        liveMultiplier: surgeData.multiplier, // Redis live
        version: surgeData.version,
        active: zone.active
      });
    }
    return enriched;
  }

  /**
   * Get all pricing rules
   */
  async getPricingRules() {
    return await prisma.pricingRule.findMany();
  }

  /**
   * Push demand metric for a zone
   */
  async pushDemand(zoneId) {
    await redisAdapter.safeDemand(zoneId);
  }

  /**
   * Push supply metric for a zone
   */
  async pushSupply(zoneId) {
    await redisAdapter.safeSupply(zoneId);
  }

  /**
   * Get current surge snapshot for a zone (used by Ride Service for consistency)
   */
  async getSurgeSnapshot(zoneId) {
    const surgeData = await redisAdapter.safeGetSurge(zoneId);
    return {
      zoneId,
      multiplier: surgeData.multiplier,
      version: surgeData.version,
      snapshotAt: new Date().toISOString()
    };
  }
}

module.exports = new PricingService();