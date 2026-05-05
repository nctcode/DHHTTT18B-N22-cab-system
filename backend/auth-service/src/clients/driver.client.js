const axios = require('axios');

const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3003';

class DriverClient {
  /**
   * Set driver offline by user_id (called on logout)
   * Uses internal endpoint: POST /drivers/internal/offline/:userId
   */
  static async setOfflineByUserId(userId) {
    try {
      await axios.post(
        `${DRIVER_SERVICE_URL}/drivers/internal/offline/${userId}`,
        {},
        { timeout: 3000 }
      );
      console.log(`[DriverClient] Driver for user ${userId} set OFFLINE`);
    } catch (error) {
      // Silently ignore — user might not be a driver
      if (error.response?.status !== 404) {
        console.warn(`[DriverClient] Could not set offline for user ${userId}:`, error.message);
      }
    }
  }
}

module.exports = DriverClient;
