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
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                // Server responded with error status
                if (error.response.status === 404) {
                    return null; // Ride not found
                }
                throw new Error(`Ride Service error: ${error.response.status}`);
            } else {
                throw new Error('Ride Service is not responding');
            }
        }
    }

    /**
     * Validate ride for review: exists, COMPLETED, and reviewer (userId) is ride.userId.
     * Returns ride so caller can use ride.driverId (not from client).
     */
    async validateRideForReview(rideId, userId) {
        const ride = await this.getRide(rideId);
        if (!ride) throw new Error('Ride not found');
        if (ride.status !== 'COMPLETED') throw new Error('Ride is not completed');
        if (String(ride.userId) !== String(userId)) {
            throw new Error('You can only review your own completed ride');
        }
        return ride;
    }
}

module.exports = new RideServiceClient();
