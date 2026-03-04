const axios = require('axios');
const { HTTP_STATUS } = require('../constants');

class AuthClient {
  constructor() {
    this.baseURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
    this.timeout = parseInt(process.env.SERVICE_TIMEOUT) || 5000;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Service-Name': process.env.SERVICE_NAME || 'user-service'
      }
    });
  }

  /**
   * Verify JWT token với auth service
   */
  async verifyToken(token) {
    try {
      const response = await this.client.post('/api/auth/verify-token', { token });
      return response.data;
    } catch (error) {
      console.error('Auth service - verifyToken error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to verify token',
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Get user info từ auth service
   */
  async getUserInfo(userId) {
    try {
      const response = await this.client.get(`/api/auth/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Auth service - getUserInfo error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get user info',
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Validate user permissions
   */
  async validatePermission(userId, permission) {
    try {
      const response = await this.client.post('/api/auth/validate-permission', {
        userId,
        permission
      });
      return response.data;
    } catch (error) {
      console.error('Auth service - validatePermission error:', error.message);
      return {
        success: false,
        message: 'Failed to validate permission',
        statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE
      };
    }
  }

  /**
   * Health check auth service
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        success: true,
        status: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: 'Auth service is unavailable'
      };
    }
  }
}

module.exports = new AuthClient();