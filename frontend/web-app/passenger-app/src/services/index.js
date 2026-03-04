import api from './api';

export const bookingService = {
  // Create a new booking
  createBooking: async (bookingData) => {
    const response = await api.post('/api/bookings', bookingData);
    return response.data;
  },

  // Get booking by ID
  getBooking: async (bookingId) => {
    const response = await api.get(`/api/bookings/${bookingId}`);
    return response.data;
  },

  // Get user's bookings
  getUserBookings: async (userId) => {
    const response = await api.get(`/api/bookings/user/${userId}`);
    return response.data;
  },

  // Cancel booking
  cancelBooking: async (bookingId) => {
    const response = await api.patch(`/api/bookings/${bookingId}/cancel`);
    return response.data;
  },
};

export const rideService = {
  // Get ride by ID
  getRide: async (rideId) => {
    const response = await api.get(`/api/rides/${rideId}`);
    return response.data;
  },

  // Get ride history
  getRideHistory: async (userId) => {
    // Backend: /passenger/:passengerId
    const response = await api.get(`/api/rides/passenger/${userId}`);
    return response.data;
  },

  // Update ride status
  updateRideStatus: async (rideId, status) => {
    const response = await api.patch(`/api/rides/${rideId}`, { status });
    return response.data;
  },
};

export const pricingService = {
  /**
   * Get fare estimate for a vehicle type.
   * Backend: POST /pricing/estimate → { baseFare, distanceFare, timeFare, surgeMultiplier, totalFare }
   * Gateway rewrites: /api/pricing → /pricing
   */
  getEstimate: async ({ distance_km, duration_min, vehicle_type, zoneId }) => {
    const response = await api.post('/api/pricing/estimate', {
      distance_km,
      duration_min: duration_min || 0,
      vehicle_type,
      zoneId: zoneId || null,
    });
    return response.data;
  },

  /**
   * Get fare estimates for ALL vehicle types at once.
   * Calls the estimate endpoint for each type concurrently.
   */
  getAllEstimates: async ({ distance_km, duration_min, zoneId }) => {
    const types = ['BIKE', 'ECONOMY', 'PREMIUM', 'SUV'];
    const results = await Promise.allSettled(
      types.map((vt) =>
        api.post('/api/pricing/estimate', {
          distance_km,
          duration_min: duration_min || 0,
          vehicle_type: vt,
          zoneId: zoneId || null,
        })
      )
    );
    return types.map((vt, i) => ({
      vehicleType: vt,
      ...(results[i].status === 'fulfilled' ? results[i].value.data?.data || {} : { error: true }),
    }));
  },

  // Get surge pricing info
  getSurgePricing: async () => {
    const response = await api.get('/api/pricing/surge');
    return response.data;
  },
};


export const paymentService = {
  // Process payment
  processPayment: async (paymentData) => {
    const response = await api.post('/api/payments', paymentData);
    return response.data;
  },

  // Get payment history
  getPaymentHistory: async (userId) => {
    const response = await api.get(`/api/payments/user/${userId}`);
    return response.data;
  },
};

export const reviewService = {
  // Submit review
  submitReview: async (rideId, targetUserId, rating, comment) => {
    const response = await api.post('/api/reviews', {
      rideId,
      targetUserId,
      rating,
      comment,
    });
    return response.data;
  },

  // Check if review exists for ride
  checkReview: async (rideId) => {
    const response = await api.get(`/api/reviews/check?rideId=${rideId}`);
    return response.data;
  },
};

export const userService = {
  // Get user profile
  getProfile: async (userId) => {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },

  // Update user profile
  updateProfile: async (userId, userData) => {
    const response = await api.patch(`/api/users/${userId}`, userData);
    return response.data;
  },

  // Get wallet balance
  getWallet: async (userId) => {
    const response = await api.get(`/api/users/${userId}/wallet`);
    return response.data;
  },
};

export const stripeService = {
  getSavedCards: async () => {
    const response = await api.get('/api/payments/stripe/saved-cards');
    return response.data;
  },
  createSetupIntent: async () => {
    const response = await api.post('/api/payments/stripe/setup-intent');
    return response.data;
  },
  saveCard: async (paymentMethodId) => {
    const response = await api.post('/api/payments/stripe/save-card', { paymentMethodId });
    return response.data;
  },
  deleteCard: async (id) => {
    const response = await api.delete(`/api/payments/stripe/saved-cards/${id}`);
    return response.data;
  }
};
