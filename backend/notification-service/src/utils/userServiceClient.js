const axios = require('axios');
require('dotenv').config();

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';

class UserServiceClient {
  async validateUser(userId) {
    try {
      // Internal service call - might need internal api key or just network trust
      // Assuming internal network trust providing service calls
      const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}/validate`, {
         // Should ideally send a special internal token, but for now assuming open internal network or reusing simple auth
         timeout: 5000
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new Error('User not found');
      }
      console.error('User validation error:', error.message);
      // In a resilient system, if User Service is down, we might allow non-critical notifs or fail.
      // For strict validation, we fail.
      throw new Error('User validation service unavailable');
    }
  }
}

module.exports = new UserServiceClient();
