const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const paymentRoutes = require('./routes/payment.routes');
const roleMiddleware = require('./middleware/role.middleware');

dotenv.config();

const app = express();

// 1. TIMEOUT MIDDLEWARE - MUST BE FIRST (before body parser)
app.use((req, res, next) => {
  req.setTimeout(60000);    // 60 seconds
  res.setTimeout(60000);    // 60 seconds
  next();
});

// 2. CORS & Body Parser
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Role Middleware (and gateway auth if needed, but role middleware covers identity extraction)
// The prompt says "Tin tưởng header do API Gateway inject".
// roleMiddleware extracts these headers.
app.use(roleMiddleware);

// 4. Body Parser Error Handler - catches JSON parse errors BEFORE routes
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON in request body',
      details: err.message
    });
  }
  next(err);
});

// 5. Routes
app.use('/payments', paymentRoutes);

// 6. 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

// 7. Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Payment Service' });
});

// 8. Global Error Handler - MUST BE LAST
app.use((err, req, res, next) => {
  if (res.headersSent) return;  // Don't send if headers already sent
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  console.error(`[Payment Service Error] ${status}: ${message}`, err);
  
  res.status(status).json({
    status: 'error',
    message: message,
    service: 'payment-service',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;