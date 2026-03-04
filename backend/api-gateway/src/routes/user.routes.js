// api-gateway/src/routes/user.routes.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// All user routes require JWT verification at Gateway
router.use(verifyToken);

// Proxy configuration for user service
const userProxy = createProxyMiddleware({
  target: services.user.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/users', // /api/users/xxx -> /users/xxx
  },
  timeout: 30000,
  proxyTimeout: 30000,
  onProxyReq: (proxyReq, req, res) => {
    // Middleware has already injected 'x-user-id' and 'x-user-role' into req.headers
    // and removed 'authorization'.
    // http-proxy-middleware forwards req.headers by default.
    
    // Forward request body for POST/PUT/PATCH
    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    console.error('[User Service] Proxy Error:', err.code);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        success: false, 
        message: 'User service is unavailable' 
      });
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
      return res.status(504).json({ 
        success: false, 
        message: 'User service request timeout' 
      });
    }
    res.status(503).json({ 
      success: false, 
      message: 'User service unavailable', 
      error: err.message 
    });
  },
});

const axios = require('axios');

// Orchestration: Delete User (Admin Only)
// 1. Delete from User Service
// 2. If success, Deactivate in Auth Service
router.delete('/:id', async (req, res, next) => {
  const userId = req.params.id;
  
  // 1. Check Admin Role
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }

  try {
    // 2. Call User Service to delete user (Soft delete)
    // Forward Authorization header or use internal API key if configured
    // Since we trust Gateway, we can just forward the headers we verified
    try {
        await axios.delete(`${services.user.url}/users/${userId}`, {
            headers: {
                'x-user-id': req.user.id,
                'x-user-role': req.user.role
            }
        });
    } catch (userErr) {
        // Map User Service errors
        if (userErr.response) {
            return res.status(userErr.response.status).json(userErr.response.data);
        }
        throw userErr;
    }

    // 3. User deleted successfully. Now deactivate account in Auth Service.
    // Eventual consistency: If this fails, user is deleted but account remains active (but user profile is gone/inactive, so login might fail anyway)
    try {
        await axios.patch(`${services.auth.url}/auth/account/${userId}/deactivate`, {}, {
             headers: {
                'x-user-id': req.user.id,
                'x-user-role': req.user.role
            }
        });
        console.log(`[Orchestration] Deactivated auth account for user ${userId}`);
    } catch (authErr) {
        // Log error but don't fail the request (Eventual Consistency)
        console.error(`[Orchestration] Failed to deactivate auth account for ${userId}:`, authErr.message);
        // We could return 500 here as requested, but the user deletion ALREADY happened.
        // User request says: "Nếu auth-service update thất bại: Log lỗi, Trả về 500".
        // Okay, we will return 500.
        return res.status(500).json({
            success: false,
            message: 'User deleted but failed to deactivate account. Please contact support.',
            error: authErr.message
        });
    }

    // 4. Return success
    return res.json({
        success: true,
        message: 'User deleted and account deactivated successfully'
    });

  } catch (error) {
    console.error('[Orchestration] User deletion error:', error.message);
    if (!res.headersSent) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error during user deletion'
        });
    }
  }
});

// Route all OTHER user requests to user service
router.use('/', userProxy);

module.exports = router;