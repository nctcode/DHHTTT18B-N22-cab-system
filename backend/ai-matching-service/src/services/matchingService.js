const axios = require('axios');

const FEATURE_STORE_URL = process.env.FEATURE_STORE_URL || 'http://localhost:4020';
const MODEL_SERVING_URL = process.env.MODEL_SERVING_URL || 'http://localhost:4010';

/**
 * Haversine distance in km
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

class MatchingService {

  /**
   * Find best driver given pickup location and available drivers.
   * Fetches driver features from Feature Store, builds feature vectors,
   * then calls Model Serving for scoring.
   */
  async findBestDriver(pickupLocation, availableDrivers, rideContext = {}) {
    if (!availableDrivers || availableDrivers.length === 0) {
      throw new Error('No available drivers provided');
    }

    // 1. Fetch features for each driver from Feature Store
    const driverFeatures = await Promise.all(
      availableDrivers.map(async (driver) => {
        let features;
        try {
          const resp = await axios.get(`${FEATURE_STORE_URL}/features/driver/${driver.id}`);
          features = resp.data?.data || {};
        } catch {
          features = {}; // fallback to defaults in model
        }

        const distanceKm = haversineKm(
          pickupLocation.lat, pickupLocation.lng,
          driver.lat || driver.current_lat, driver.lng || driver.current_lng
        );

        return {
          driverId: driver.id,
          distanceKm,
          rating: features.rating || driver.rating || 4.5,
          acceptanceRate: features.acceptanceRate || 0.85,
          cancellationRate: features.cancellationRate || 0.05,
          avgResponseTimeSec: features.avgResponseTimeSec || 15,
        };
      })
    );

    // 2. Call Model Serving for prediction
    try {
      const resp = await axios.post(`${MODEL_SERVING_URL}/predict/matching`, {
        drivers: driverFeatures,
      });

      const ranked = resp.data?.data;
      if (ranked && ranked.length > 0) {
        const best = ranked[0];
        return {
          bestDriverId: best.driverId,
          score: best.score,
          confidence: best.confidence,
          allRanked: ranked,
        };
      }
    } catch (err) {
      console.error('Model Serving unavailable, using distance fallback:', err.message);
    }

    // 3. Fallback: nearest driver
    driverFeatures.sort((a, b) => a.distanceKm - b.distanceKm);
    return {
      bestDriverId: driverFeatures[0].driverId,
      score: 1.0 - (driverFeatures[0].distanceKm / 10),
      confidence: 0.50,
      fallback: true,
    };
  }
}

module.exports = new MatchingService();
