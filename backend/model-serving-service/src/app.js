const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const predictionRoutes = require('./routes/predictionRoutes');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'model-serving-service' }));
app.use('/', predictionRoutes);

module.exports = app;
