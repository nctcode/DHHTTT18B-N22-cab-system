const modelRegistry = require('../services/modelRegistry');

const send = (res, code, success, message, data = null) =>
  res.status(code).json({ success, message, data });

class PredictionController {

  // POST /predict/matching
  predictMatching(req, res) {
    try {
      const results = modelRegistry.predictMatching(req.body);
      send(res, 200, true, 'Matching prediction', results);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }

  // POST /predict/eta
  predictETA(req, res) {
    try {
      const result = modelRegistry.predictETA(req.body);
      send(res, 200, true, 'ETA prediction', result);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }

  // POST /predict/surge
  predictSurge(req, res) {
    try {
      const result = modelRegistry.predictSurge(req.body);
      send(res, 200, true, 'Surge prediction', result);
    } catch (e) {
      send(res, 500, false, e.message);
    }
  }

  // GET /models
  listModels(req, res) {
    const models = modelRegistry.listModels();
    send(res, 200, true, 'Loaded models', models);
  }

  // POST /models/reload
  reloadModels(req, res) {
    const models = modelRegistry.reloadAll();
    send(res, 200, true, 'Models reloaded', models);
  }
}

module.exports = new PredictionController();
