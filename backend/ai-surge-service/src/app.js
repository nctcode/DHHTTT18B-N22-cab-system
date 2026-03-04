const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

const router = express.Router();
const ctrl = require('./controllers/surgeController');
router.post('/predict', ctrl.predict);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ai-surge-service' }));
app.use('/ai/surge', router);

module.exports = app;
