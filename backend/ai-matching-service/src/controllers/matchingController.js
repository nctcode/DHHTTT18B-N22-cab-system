const matchingService = require('../services/matchingService');

const send = (res, code, success, message, data = null) =>
  res.status(code).json({ success, message, data });

class MatchingController {
  async findBestDriver(req, res) {
    try {
      const { pickupLocation, availableDrivers, rideContext } = req.body;

      if (!pickupLocation || !pickupLocation.lat || !pickupLocation.lng) {
        return send(res, 400, false, 'pickupLocation with lat/lng is required');
      }
      if (!availableDrivers || !Array.isArray(availableDrivers) || availableDrivers.length === 0) {
        return send(res, 400, false, 'availableDrivers array is required and must not be empty');
      }

      const result = await matchingService.findBestDriver(pickupLocation, availableDrivers, rideContext);
      send(res, 200, true, 'Best driver found', result);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }
}

module.exports = new MatchingController();
