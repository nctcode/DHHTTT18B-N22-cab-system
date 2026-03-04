const axios = require('axios');

const FEATURE_STORE_URL = process.env.FEATURE_STORE_URL || 'http://localhost:4020';
const MODEL_SERVING_URL = process.env.MODEL_SERVING_URL || 'http://localhost:4010';

class SurgeService {

  async predict(zoneId, timeOfDay, dayOfWeek, specialEvent = false) {
    const now = new Date();
    const hour = timeOfDay ?? now.getHours();
    const dow = dayOfWeek ?? now.getDay();

    // 1. Fetch zone features from Feature Store
    let zoneFeatures = { demandCount: 10, supplyCount: 8 };
    try {
      const resp = await axios.get(`${FEATURE_STORE_URL}/features/zone/${zoneId || 'default'}`);
      if (resp.data?.data) {
        zoneFeatures = resp.data.data;
      }
    } catch { /* use defaults */ }

    // 2. Call Model Serving
    try {
      const resp = await axios.post(`${MODEL_SERVING_URL}/predict/surge`, {
        demandCount: zoneFeatures.demandCount || 10,
        supplyCount: zoneFeatures.supplyCount || 8,
        hourOfDay: hour,
        dayOfWeek: dow,
        specialEvent,
      });

      const prediction = resp.data?.data;
      if (prediction) {
        return {
          ...prediction,
          zoneId: zoneId || 'default',
          source: 'model',
        };
      }
    } catch (err) {
      console.error('Model Serving unavailable for surge, using fallback:', err.message);
    }

    // 3. Fallback: simple ratio-based
    const ratio = zoneFeatures.supplyCount > 0
      ? zoneFeatures.demandCount / zoneFeatures.supplyCount
      : 1.5;

    let multiplier = 1.0;
    let level = 'NONE';
    if (ratio > 2.0) { multiplier = 1.8; level = 'HIGH'; }
    else if (ratio > 1.5) { multiplier = 1.5; level = 'MEDIUM'; }
    else if (ratio > 1.2) { multiplier = 1.2; level = 'LOW'; }

    return {
      surgeMultiplier: multiplier,
      surgeLevel: level,
      zoneId: zoneId || 'default',
      confidence: 0.50,
      source: 'fallback',
    };
  }
}

module.exports = new SurgeService();
