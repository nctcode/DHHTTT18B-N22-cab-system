import api from './api';

const bookingService = {
    /**
     * Get booking details by ID
     */
    getBooking: async (bookingId) => {
        const response = await api.get(`/api/bookings/${bookingId}`);
        return response.data;
    }
};

export default bookingService;
