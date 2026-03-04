const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const trainingService = require('./services/trainingService');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

const send = (res, code, success, message, data = null) =>
  res.status(code).json({ success, message, data });

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ml-training-service' }));

// Trigger model retraining
app.post('/training/trigger/:modelType', async (req, res) => {
  try {
    const result = await trainingService.trainModel(req.params.modelType);
    send(res, 200, true, 'Training completed', result);
  } catch (e) {
    send(res, 500, false, e.message);
  }
});

// Get training status
app.get('/training/status', (req, res) => {
  send(res, 200, true, 'Training status', trainingService.getStatus());
});

// Get dataset stats
app.get('/training/datasets/:modelType/stats', (req, res) => {
  const stats = trainingService.getDatasetStats(req.params.modelType);
  send(res, 200, true, 'Dataset stats', stats);
});

// Ingest trip completed event
app.post('/training/ingest/trip-completed', async (req, res) => {
  try {
    const result = await trainingService.ingestTripCompleted(req.body);
    send(res, 200, true, 'Trip data ingested', result);
  } catch (e) {
    send(res, 500, false, e.message);
  }
});

module.exports = app;
