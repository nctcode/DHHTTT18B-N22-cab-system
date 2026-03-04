const etaService = require('../services/etaService');

const send = (res, code, success, message, data = null) =>
  res.status(code).json({ success, message, data });

class ETAController {
  async predict(req, res) {
    try {
      const { pickup, destination, timeOfDay, dayOfWeek } = req.body;

      if (!pickup?.lat || !pickup?.lng || !destination?.lat || !destination?.lng) {
        return send(res, 400, false, 'pickup and destination with lat/lng are required');
      }

      const result = await etaService.predict(pickup, destination, timeOfDay, dayOfWeek);
      send(res, 200, true, 'ETA prediction', result);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }
}

module.exports = new ETAController();
