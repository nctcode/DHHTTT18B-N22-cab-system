// src/utils/rideServiceClient.js
const axios = require('axios');

const RIDE_SERVICE_URL = process.env.RIDE_SERVICE_URL || 'http://ride-service:3005';

class RideServiceClient {
    /**
     * Get ride details from Ride Service
     * @param {string} rideId - UUID of the ride
     * @returns {Promise<Object>} Ride object
     */
    async getRide(rideId) {
        try {
            const response = await axios.get(`${RIDE_SERVICE_URL}/rides/${rideId}`, {
                timeout: 5000,
                headers: { 'Content-Type': 'application/json' }
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) return null;
                throw new Error(`Ride Service error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
            }
            if (error.request) throw new Error('Ride Service is not responding');
            throw new Error(`Failed to fetch ride: ${error.message}`);
        }
    }

    /**
     * Check if ride is completed
     * @param {string} rideId - UUID of the ride
     * @returns {Promise<boolean>} True if ride is completed
     */
    async isRideCompleted(rideId) {
        const ride = await this.getRide(rideId);
        return ride && ride.status === 'COMPLETED';
    }
}

module.exports = new RideServiceClient();
