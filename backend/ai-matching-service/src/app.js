const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const matchingRoutes = require('./routes/matchingRoutes');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ai-matching-service' }));
app.use('/ai/matching', matchingRoutes);

module.exports = app;
