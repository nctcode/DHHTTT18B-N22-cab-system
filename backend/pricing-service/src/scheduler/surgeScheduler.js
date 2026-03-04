const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redisAdapter = require('../adapters/redis.adapter');
const surgePricingAI = require('../ai/surgePricing.ai');
const eventBus = require('../events/eventBus');
const { EVENTS } = require('../events/eventContracts');
const axios = require('axios');

const AI_SURGE_URL = process.env.AI_SURGE_URL || 'http://localhost:4003';
let surgeVersion = 0;

class SurgeScheduler {
  constructor(intervalMs = 60000) { // Default 1 minute
    this.intervalMs = intervalMs;
    this._timer = null;
  }

  start() {
    console.log(`[Scheduler] Surge pricing loop started (every ${this.intervalMs / 1000}s)`);
    this._timer = setInterval(() => this.tick(), this.intervalMs);
    // Run immediately on start too
    this.tick();
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      console.log('[Scheduler] Surge pricing loop stopped');
    }
  }

  async tick() {
    try {
      console.log('[Scheduler] ─── Surge Update Cycle ───');

      // 1. Get all active surge zones from DB (configuration source)
      const zones = await prisma.surgeZone.findMany({ where: { active: true } });

      if (zones.length === 0) {
        console.log('[Scheduler] No active surge zones found.');
        return;
      }

      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      for (const zone of zones) {
        // 2. Fetch metrics from Redis
        const metrics = await redisAdapter.safeGetMetrics(zone.id);

        let newMultiplier;

        // 3. Try AI Surge Service first, fallback to local AI
        try {
          const resp = await axios.post(`${AI_SURGE_URL}/ai/surge/predict`, {
            zoneId: zone.id,
            timeOfDay: hour,
            dayOfWeek,
            specialEvent: false,
          }, { timeout: 3000 });

          newMultiplier = resp.data?.data?.surgeMultiplier;
          if (newMultiplier) {
            console.log(`[Scheduler] AI Surge → zone "${zone.area_name}": ${newMultiplier}x (${resp.data.data.surgeLevel})`);
          }
        } catch {
          // Fallback to local AI module
        }

        if (!newMultiplier) {
          const features = {
            demand: metrics.demand,
            supply: metrics.supply,
            hour,
            isWeekend,
            isSpecialEvent: false,
          };
          newMultiplier = surgePricingAI.calculateMultiplier(features);
        }

        // 4. Increment version
        surgeVersion++;

        // 5. Update Redis surge cache (versioned)
        const updated = await redisAdapter.safeSetSurge(zone.id, newMultiplier, surgeVersion);

        if (updated) {
          // 6. Publish SurgePriceUpdated event
          eventBus.publish(EVENTS.SURGE_PRICE_UPDATED, {
            zoneId: zone.id,
            areaName: zone.area_name,
            multiplier: newMultiplier,
            version: surgeVersion,
            timestamp: now.toISOString()
          });

          console.log(`[Scheduler] Zone "${zone.area_name}": ${newMultiplier}x (v${surgeVersion})`);
        }
      }

      console.log('[Scheduler] ─── Cycle Complete ───');
    } catch (error) {
      console.error('[Scheduler] Error during surge update cycle:', error.message);
    }
  }
}

module.exports = SurgeScheduler;

