const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const featureRoutes = require('./routes/featureRoutes');

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'feature-store-service' }));
app.use('/features', featureRoutes);

module.exports = app;
