const express = require('express');
const app = express();
// Middleware to parse JSON requests
app.use(express.json());

// Guard middleware to block direct access
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  
  const gatewaySecret = process.env.GATEWAY_SHARED_SECRET || 'cab-gateway-internal-secret';
  if (req.headers['x-gateway-secret'] !== gatewaySecret) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Request must pass through API Gateway'
    });
  }
  next();
});

app.use('/auth', require('./routes/auth.routes'));

module.exports = app;
