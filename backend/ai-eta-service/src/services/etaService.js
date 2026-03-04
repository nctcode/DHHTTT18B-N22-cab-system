const axios = require('axios');

const FEATURE_STORE_URL = process.env.FEATURE_STORE_URL || 'http://localhost:4020';
const MODEL_SERVING_URL = process.env.MODEL_SERVING_URL || 'http://localhost:4010';
const ROUTING_SERVICE_URL = process.env.ROUTING_SERVICE_URL || 'http://routing-service:4040';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

class ETAService {

  async predict(pickup, destination, timeOfDay, dayOfWeek) {
    let distanceKm;
    try {
      const routeResp = await axios.post(`${ROUTING_SERVICE_URL}/route`, { pickup, destination }, { timeout: 2000 });
      distanceKm = routeResp.data.distanceKm;
    } catch (e) {
      // console.warn('Routing Service unavailable, using Haversine');
      distanceKm = haversineKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
    }
    const now = new Date();
    const hour = timeOfDay ?? now.getHours();
    const dow = dayOfWeek ?? now.getDay();

    // Try Model Serving
    try {
      const resp = await axios.post(`${MODEL_SERVING_URL}/predict/eta`, {
        distanceKm,
        hourOfDay: hour,
        dayOfWeek: dow,
      });

      const prediction = resp.data?.data;
      if (prediction) {
        return {
          ...prediction,
          distanceKm: parseFloat(distanceKm.toFixed(2)),
          source: 'model',
        };
      }
    } catch (err) {
      console.error('Model Serving unavailable for ETA, using fallback:', err.message);
    }

    // Fallback: use Feature Store avg speed
    let avgSpeed = 25;
    try {
      const resp = await axios.get(`${FEATURE_STORE_URL}/features/trip-context`);
      const ctx = resp.data?.data;
      if (ctx?.avgSpeedByHour?.[String(hour)]) {
        avgSpeed = ctx.avgSpeedByHour[String(hour)];
      }
    } catch { /* use default */ }

    const durationMin = Math.max(2, Math.round((distanceKm / avgSpeed) * 60));
    const arrivalMin = Math.max(1, Math.round(durationMin * 0.3)); // rough pickup ETA

    return {
      predictedArrivalMinutes: arrivalMin,
      predictedTripDurationMinutes: durationMin,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      source: 'fallback',
    };
  }
}

module.exports = new ETAService();
