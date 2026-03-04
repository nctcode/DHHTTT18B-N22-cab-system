const surgeService = require('../services/surgeService');

const send = (res, code, success, message, data = null) =>
  res.status(code).json({ success, message, data });

class SurgeController {
  async predict(req, res) {
    try {
      const { zoneId, timeOfDay, dayOfWeek, specialEvent } = req.body;
      const result = await surgeService.predict(zoneId, timeOfDay, dayOfWeek, specialEvent);
      send(res, 200, true, 'Surge prediction', result);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }
}

module.exports = new SurgeController();
