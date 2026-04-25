const express = require('express');
const axios = require('axios');
const services = require('../config/services.config');

const router = express.Router();

/**
 * POST /api/mcp/context
 * Aggregates data from Routing, ETA, Pricing, and Driver services to build a unified context.
 */
router.post('/context', async (req, res) => {
  console.log(`[MCP] Received /context request. Body:`, req.body);
  const { rideId, pickup, drop } = req.body;

  if (!pickup || !drop) {
    return res.status(400).json({
      success: false,
      message: 'Missing pickup or drop coordinates'
    });
  }

  const context = {
    rideId: rideId || null,
    distance_km: null,
    duration_min: null,
    eta_minutes: null,
    price: null,
    drivers: []
  };

  try {
    // 1. Concurrent Calls: Routing, ETA, Drivers
    const timeOfDay = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    const [routeResult, etaResult, driversResult] = await Promise.allSettled([
      // A. Route Service
      axios.post(`${services.routing.url}/route`, {
        pickup: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: drop.lat, lng: drop.lng }
      }, { timeout: 10000 }).then(res => res.data),

      // B. ETA Service
      axios.post(`${services.aiEta.url}/ai/eta/predict`, {
        pickup: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: drop.lat, lng: drop.lng },
        timeOfDay,
        dayOfWeek
      }, { timeout: 5000 }).then(res => res.data),

      // C. Driver Service
      axios.get(`${services.driver.url}/drivers/available`, {
        params: { lat: pickup.lat, lng: pickup.lng, radius: 5 },
        timeout: 5000
      }).then(res => res.data)
    ]);

    // Process Route Result
    if (routeResult.status === 'fulfilled' && routeResult.value?.success) {
      context.distance_km = routeResult.value.data?.distanceKm || null;
      context.duration_min = routeResult.value.data?.durationMin || null;
      console.log(`[MCP] Routing success: ${context.distance_km}km, ${context.duration_min}min`);
    } else {
      console.warn(`[MCP] Routing failed:`, routeResult.reason?.message || 'Unknown error');
    }

    // Process ETA Result
    if (etaResult.status === 'fulfilled' && etaResult.value?.success) {
      context.eta_minutes = etaResult.value.data?.predictedArrivalMinutes || null;
      console.log(`[MCP] ETA success: ${context.eta_minutes}min`);
    } else {
      console.warn(`[MCP] ETA failed:`, etaResult.reason?.message || 'Unknown error');
    }

    // Process Driver Result
    if (driversResult.status === 'fulfilled' && driversResult.value?.success) {
      context.drivers = driversResult.value.data || [];
      console.log(`[MCP] Drivers success: found ${context.drivers.length} drivers`);
    } else {
      console.warn(`[MCP] Driver failed:`, driversResult.reason?.message || 'Unknown error');
    }

    // 2. Sequential Dependent Call: Pricing
    // We only call pricing if we have distance and duration
    if (context.distance_km !== null && context.duration_min !== null) {
      try {
        const pricingResult = await axios.post(`${services.pricing.url}/pricing/estimate`, {
          distance_km: context.distance_km,
          duration_min: context.duration_min,
          vehicle_type: 'ECONOMY' // Default vehicle type to get a single price
        }, { timeout: 5000 });
        
        if (pricingResult.data?.success) {
          context.price = pricingResult.data.data?.totalFare || null;
          console.log(`[MCP] Pricing success: ${context.price} VND`);
        }
      } catch (pricingError) {
        console.warn(`[MCP] Pricing failed:`, pricingError.message);
      }
    } else {
      console.warn(`[MCP] Skipping Pricing: distance_km or duration_min missing.`);
    }

    console.log(`[MCP] Final context aggregated successfully for rideId: ${rideId}`);
    return res.status(200).json({
      success: true,
      context
    });

  } catch (error) {
    // Top level error catch, shouldn't hit due to Promise.allSettled unless something critical fails
    console.error(`[MCP] Critical failure in context aggregation:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate context',
      context // Return partial context built so far
    });
  }
});

module.exports = router;
