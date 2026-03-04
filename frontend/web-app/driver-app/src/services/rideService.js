import api from './api';

const rideService = {
    /**
     * Accept a ride request (Creates a ride record)
     */
    acceptRide: async (bookingId, passengerId, driverId, driverLocation) => {
        const response = await api.post('/api/rides', {
            bookingId,
            passengerId,
            driverId,
            driverLocation
        });
        return response.data;
    },

    /**
     * Get ride details
     */
    getRide: async (rideId) => {
        const response = await api.get(`/api/rides/${rideId}`);
        return response.data;
    },

    /**
     * Start the ride
     */
    startRide: async (rideId) => {
        const response = await api.patch(`/api/rides/${rideId}/start`);
        return response.data;
    },

    /**
     * Complete the ride
     */
    completeRide: async (rideId, metrics) => {
        const response = await api.patch(`/api/rides/${rideId}/complete`, metrics);
        return response.data;
    },

    /**
     * Stage 3: Driver arrived at pickup point
     */
    arriveRide: async (rideId) => {
        const response = await api.patch(`/api/rides/${rideId}/arrive`);
        return response.data;
    },

    /**
     * Update driver location (if not handled by socket)
     */
    updateLocation: async (rideId, lat, lng) => {
        // Usually handled by socket, but maybe API fallback
    },

    /**
     * Driver cancels ride after accepting (triggers rematching)
     */
    driverCancelRide: async (rideId) => {
        const response = await api.patch(`/api/rides/${rideId}/driver-cancel`);
        return response.data;
    },

    /**
     * Dev/Simulation: Force a wallet payment to SUCCESS (for testing)
     */
    simulateWalletPayment: async (rideId) => {
        const response = await api.patch(`/api/rides/${rideId}/simulate-wallet`);
        return response.data;
    }
};

export default rideService;
