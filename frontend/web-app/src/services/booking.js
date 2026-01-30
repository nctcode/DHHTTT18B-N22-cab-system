import api from './api';

export const bookingService = {
  createBooking: (data) => api.post('/bookings', data),
  getBookings: (params) => api.get('/bookings', { params }),
  getBookingById: (id) => api.get(`/bookings/${id}`),
  updateBooking: (id, data) => api.put(`/bookings/${id}`, data),
  cancelBooking: (id) => api.delete(`/bookings/${id}`),
  getAvailableSlots: (date) => api.get('/bookings/slots', { params: { date } }),
  getDriverBookings: (driverId) => api.get(`/bookings/driver/${driverId}`),
};