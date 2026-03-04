const express = require("express");
const rideRoutes = require("./routes/ride.routes");

const app = express();

// 1. TIMEOUT MIDDLEWARE - MUST BE FIRST (before body parser)
app.use((req, res, next) => {
  req.setTimeout(60000);    // 60 seconds
  res.setTimeout(60000);    // 60 seconds
  next();
});

// 2. Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const { gatewayAuth } = require('./middleware/gatewayAuth');
app.use(gatewayAuth);

// 3. Body Parser Error Handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON in request body',
      details: err.message
    });
  }
  if (err.code === 'ECONNABORTED') {
    return res.status(408).json({
      status: 'error',
      message: 'Request timeout - connection aborted',
      code: 'ECONNABORTED'
    });
  }
  next(err);
});

// 4. Routes
app.use("/rides", rideRoutes);

// 5. 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

// 6. Global Error Handler - MUST BE LAST
app.use((err, req, res, next) => {
  if (res.headersSent) return;  // Don't send if headers already sent
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  console.error(`[Ride Service Error] ${status}: ${message}`, err);
  
  res.status(status).json({
    status: 'error',
    message: message,
    service: 'ride-service',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
