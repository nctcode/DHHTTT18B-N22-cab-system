const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Body parser với error handling
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Request timeout handler
app.use((req, res, next) => {
  req.setTimeout(10000); // 10 seconds
  res.setTimeout(10000);
  
  // Handle connection abort
  req.on('aborted', () => {
    console.log('Request aborted by client:', req.method, req.url);
  });
  
  next();
});

// Trust gateway headers (JWT already verified at gateway)
const { gatewayAuth } = require('./middleware/gatewayAuth');
app.use(gatewayAuth);

// Routes
app.use('/users', require('./routes/user.routes'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User service is healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('User Service Error:', err.message);
  
  // JSON parse error
  if (err.message === 'Invalid JSON') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload'
    });
  }
  
  // Prisma errors
  if (err.name?.includes('Prisma')) {
    console.error('Prisma Error:', err);
    return res.status(400).json({
      success: false,
      message: 'Database error',
      code: err.code
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ User Service running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
});