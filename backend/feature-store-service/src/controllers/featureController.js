const featureService = require('../services/featureService');

const send = (res, code, success, message, data = null) =>
  res.status(code).json({ success, message, data });

class FeatureController {

  // GET /features/driver/:driverId
  async getDriverFeatures(req, res) {
    try {
      const data = await featureService.getDriverFeatures(req.params.driverId);
      send(res, 200, true, 'Driver features', data);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }

  // PUT /features/driver/:driverId
  async updateDriverFeatures(req, res) {
    try {
      const data = await featureService.updateDriverFeatures(req.params.driverId, req.body);
      send(res, 200, true, 'Driver features updated', data);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }

  // GET /features/zone/:zoneId
  async getZoneFeatures(req, res) {
    try {
      const data = await featureService.getZoneFeatures(req.params.zoneId);
      send(res, 200, true, 'Zone features', data);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }

  // PUT /features/zone/:zoneId
  async updateZoneFeatures(req, res) {
    try {
      const data = await featureService.updateZoneFeatures(req.params.zoneId, req.body);
      send(res, 200, true, 'Zone features updated', data);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }

  // POST /features/zone/:zoneId/demand
  async incrementDemand(req, res) {
    try {
      const data = await featureService.incrementZoneDemand(req.params.zoneId);
      send(res, 200, true, 'Demand incremented', data);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }

  // POST /features/zone/:zoneId/supply
  async incrementSupply(req, res) {
    try {
      const data = await featureService.incrementZoneSupply(req.params.zoneId);
      send(res, 200, true, 'Supply incremented', data);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }

  // GET /features/trip-context
  getTripContext(req, res) {
    const data = featureService.getTripContext();
    send(res, 200, true, 'Trip context features', data);
  }

  // GET /features/vehicle-config
  getVehicleConfig(req, res) {
    const data = featureService.getAllVehicleConfigs();
    send(res, 200, true, 'Vehicle configurations', data);
  }
}

module.exports = new FeatureController();
