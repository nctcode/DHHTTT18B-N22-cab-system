const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redisAdapter = require('../adapters/redis.adapter');
const axios = require('axios');

const AI_SURGE_URL = process.env.AI_SURGE_URL || 'http://localhost:4003';

class PricingService {

  // ═══════════════════════════════════════════════════════════════════
  // VALIDATION HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Validate and sanitize demand_index.
   * Rule: null/undefined → 0, negative → clamp to 0
   * @param {*} raw - Raw demand_index from request
   * @returns {number} Sanitized demand_index (≥ 0)
   */
  _sanitizeDemandIndex(raw) {
    if (raw === null || raw === undefined) return 0;
    const val = Number(raw);
    // Guard against NaN (e.g. "abc" passed as demand_index)
    if (isNaN(val)) return 0;
    // Negative demand makes no sense → clamp to 0
    return Math.max(0, val);
  }

  /**
   * Validate and sanitize supply_index.
   * Rule: null/undefined → 1, negative → 1, zero → 1 (prevent division by zero)
   * @param {*} raw - Raw supply_index from request
   * @returns {number} Sanitized supply_index (> 0)
   */
  _sanitizeSupplyIndex(raw) {
    if (raw === null || raw === undefined) return 1;
    const val = Number(raw);
    // Guard against NaN
    if (isNaN(val)) return 1;
    // EXPLICIT: supply ≤ 0 is invalid → default to 1 to prevent division by zero
    // We do NOT use (supply || 1) because that would silently hide bugs
    if (val <= 0) return 1;
    return val;
  }

  /**
   * Calculate surge multiplier from demand/supply indexes.
   * Formula: surge = max(1.0, demand_index / supply_index)
   *
   * Key rules:
   * - Surge NEVER < 1
   * - demand = 0 → surge = 1 (off-peak, no demand)
   * - No NaN / Infinity in output
   *
   * @param {number} demandIndex - Sanitized demand index (≥ 0)
   * @param {number} supplyIndex - Sanitized supply index (> 0)
   * @returns {number} Surge multiplier (≥ 1.0)
   */
  _calculateSurgeFromIndexes(demandIndex, supplyIndex) {
    // Explicit safe division — supplyIndex is guaranteed > 0 by _sanitizeSupplyIndex
    const safeSupply = supplyIndex > 0 ? supplyIndex : 1;
    const rawSurge = demandIndex / safeSupply;

    // Guard: ensure result is a valid finite number
    if (!isFinite(rawSurge) || isNaN(rawSurge)) return 1.0;

    // Rule: surge NEVER < 1
    return Math.max(1.0, rawSurge);
  }

  /**
   * Check if the request explicitly provides demand/supply indexes.
   * "Explicit" means the field exists and is not undefined.
   * Even demand_index = 0 counts as explicitly provided.
   *
   * @param {Object} data - Request data
   * @returns {boolean}
   */
  _hasExplicitIndexes(data) {
    return data.demand_index !== undefined || data.supply_index !== undefined;
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN ESTIMATE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * POST /pricing/estimate
   * Calculate fare estimate with surge applied.
   *
   * Surge source priority:
   * 1. If demand_index / supply_index provided → use formula directly (skip AI)
   * 2. Else → AI Surge Service → Redis fallback
   *
   * @param {Object} data { zoneId, distance_km, duration_min, vehicle_type, demand_index?, supply_index? }
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

    // 2. Determine surge multiplier
    let surgeMultiplier = 1.0;
    let surgeVersion = 0;
    let surgeSource = 'none';

    if (this._hasExplicitIndexes(data)) {
      // ── OVERRIDE: Client provided demand/supply indexes ──
      // Use the direct formula, skip AI Surge Service entirely.
      const demandIndex = this._sanitizeDemandIndex(data.demand_index);
      const supplyIndex = this._sanitizeSupplyIndex(data.supply_index);
      surgeMultiplier = this._calculateSurgeFromIndexes(demandIndex, supplyIndex);
      surgeSource = 'demand_supply_index';
      console.log(`📊 Index-based surge: demand=${demandIndex}, supply=${supplyIndex} → ${surgeMultiplier}x`);
    } else {
      // ── DEFAULT: AI Surge Service → Redis fallback ──
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
    }

    // ── SAFETY NET: surge NEVER < 1 regardless of source ──
    surgeMultiplier = Math.max(1.0, surgeMultiplier);

    // 3. Calculate fare
    const baseFare = rule.base_fare;
    const distanceFare = rule.price_per_km * distance_km;
    const timeFare = rule.price_per_min * (duration_min || 0);
    const subtotal = baseFare + distanceFare + timeFare;
    const calculatedFare = Math.round(subtotal * surgeMultiplier);

    // ── SAFETY NET: totalFare NEVER = 0, minimum is baseFare ──
    const totalFare = Math.max(Math.round(baseFare), calculatedFare);

    return {
      baseFare,
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      surgeMultiplier,
      surgeVersion, // For snapshot consistency
      surgeSource,  // Transparency: where surge came from
      totalFare,
      currency: 'VND',
      breakdown: {
        vehicle_type,
        distance_km,
        duration_min: duration_min || 0,
        base_fare: baseFare,
        price_per_km: rule.price_per_km,
        price_per_min: rule.price_per_min,
        surgeApplied: surgeMultiplier > 1.0,
        demand_index: data.demand_index !== undefined ? this._sanitizeDemandIndex(data.demand_index) : null,
        supply_index: data.supply_index !== undefined ? this._sanitizeSupplyIndex(data.supply_index) : null,
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // OTHER METHODS (unchanged)
  // ═══════════════════════════════════════════════════════════════════

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