const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';

class UserClient {
  /**
   * Create user profile in User Service
   * Returns the created user object including the generated ID
   */
  static async createUser(userData) {
    try {
      const response = await axios.post(`${USER_SERVICE_URL}/users/register`, userData, {
        timeout: 5000
      });
      return response.data.data || response.data;
    } catch (error) {
      this.handleError(error, 'Error creating user in User Service');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/users/${userId}`, {
        timeout: 5000
      });
      return response.data.data || response.data;
    } catch (error) {
       // Return null if not found (404)
       if (error.response?.status === 404) return null;
       this.handleError(error, 'Error fetching user from User Service');
    }
  }

  /**
   * Delete user by ID (used for compensation/rollback)
   */
  static async deleteUser(userId) {
    try {
      const response = await axios.delete(`${USER_SERVICE_URL}/users/${userId}`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`[UserClient] User ${userId} already deleted or not found`);
        return null;
      }
      this.handleError(error, 'Error deleting user from User Service');
    }
  }

  /**
   * Handle Axios errors consistently
   */
  static handleError(error, contextMessage) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.response.data?.error || error.message;
      
      const newError = new Error(message);
      newError.status = status;
        // Map common errors
      if (status === 409) newError.code = 'USER_EXISTS';
      
      throw newError;
    } else if (error.request) {
      // No response received (network error)
      const newError = new Error('User Service Unavailable');
      newError.status = 503;
      newError.code = 'SERVICE_UNAVAILABLE';
      throw newError;
    } else {
      // Request setup error
      console.error(`${contextMessage}:`, error.message);
      throw error;
    }
  }
}

module.exports = UserClient;
