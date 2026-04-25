const pricingService = require('../services/pricingService');

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({ success, message, data });
};

const handleError = (res, error) => {
  console.error('[PricingController]', error.message);
  if (error.message.includes('not found') || error.message.includes('No pricing rule')) {
    return sendResponse(res, 404, false, error.message);
  }
  if (error.message.includes('required') || error.message.includes('must be')) {
    return sendResponse(res, 400, false, error.message);
  }
  sendResponse(res, 500, false, error.message || 'Internal Server Error');
};

class PricingController {

  /**
   * POST /pricing/estimate
   * Body/Query: zoneId, distance_km, duration_min, vehicle_type, demand_index?, supply_index?
   */
  async estimate(req, res) {
    try {
      // Helper: parse a float value, preserving undefined vs 0
      // parseFloat("0") → 0, parseFloat(undefined) → NaN → we return undefined
      const parseOptionalFloat = (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? undefined : parsed;
      };

      const data = {
        zoneId: req.query.zoneId || req.body.zoneId,
        distance_km: parseFloat(req.query.distance_km || req.body.distance_km),
        duration_min: parseFloat(req.query.duration_min || req.body.duration_min) || 0,
        vehicle_type: req.query.vehicle_type || req.body.vehicle_type,
        // demand_index / supply_index: preserve 0 as valid value, undefined means "not provided"
        demand_index: parseOptionalFloat(req.query.demand_index ?? req.body.demand_index),
        supply_index: parseOptionalFloat(req.query.supply_index ?? req.body.supply_index),
      };

      const result = await pricingService.estimate(data);
      sendResponse(res, 200, true, 'Fare estimate', result);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * GET /pricing/surge
   * Returns all active surge zones with live Redis multiplier
   */
  async getSurgeZones(req, res) {
    try {
      const zones = await pricingService.getActiveSurgeZones();
      sendResponse(res, 200, true, 'Active surge zones', zones);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * GET /pricing/surge/snapshot/:zoneId
   * Returns current surge snapshot for consistency guarantee
   */
  async getSurgeSnapshot(req, res) {
    try {
      const snapshot = await pricingService.getSurgeSnapshot(req.params.zoneId);
      sendResponse(res, 200, true, 'Surge snapshot', snapshot);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * GET /pricing/rules
   * Returns all pricing rules
   */
  async getRules(req, res) {
    try {
      const rules = await pricingService.getPricingRules();
      sendResponse(res, 200, true, 'Pricing rules', rules);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * POST /pricing/metrics/demand
   * Body: { zoneId }
   */
  async pushDemand(req, res) {
    try {
      const { zoneId } = req.body;
      if (!zoneId) return sendResponse(res, 400, false, 'zoneId is required');
      await pricingService.pushDemand(zoneId);
      sendResponse(res, 200, true, 'Demand metric recorded');
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * POST /pricing/metrics/supply
   * Body: { zoneId }
   */
  async pushSupply(req, res) {
    try {
      const { zoneId } = req.body;
      if (!zoneId) return sendResponse(res, 400, false, 'zoneId is required');
      await pricingService.pushSupply(zoneId);
      sendResponse(res, 200, true, 'Supply metric recorded');
    } catch (error) {
      handleError(res, error);
    }
  }
}

module.exports = new PricingController();