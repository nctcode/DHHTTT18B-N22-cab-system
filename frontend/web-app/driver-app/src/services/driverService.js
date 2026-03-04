import api from './api';

export const driverService = {
  // Get driver profile for current logged-in user (by JWT)
  getMyProfile: async () => {
    const response = await api.get('/api/drivers/profile/me');
    return response.data;
  },

  // Create driver profile
  createProfile: async (data) => {
    const response = await api.post('/api/drivers', data);
    return response.data;
  },

  // Get driver by ID
  getDriver: async (driverId) => {
    const response = await api.get(`/api/drivers/${driverId}`);
    return response.data;
  },

  // Update driver availability (online/offline)
  updateStatus: async (driverId, is_available) => {
    const response = await api.patch(`/api/drivers/${driverId}/status`, { is_available });
    return response.data;
  },

  // Update driver location
  updateLocation: async (driverId, current_lat, current_lng) => {
    const response = await api.patch(`/api/drivers/${driverId}/location`, {
      current_lat,
      current_lng,
    });
    return response.data;
  },

  // Update driver info
  updateDriver: async (driverId, data) => {
    const response = await api.put(`/api/drivers/${driverId}`, data);
    return response.data;
  },
};

export default driverService;
