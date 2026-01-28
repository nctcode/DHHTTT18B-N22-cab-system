import api from './api';

const adminAPI = {
  getDashboardStats: () => api.get('/auth/admin/dashboard/stats'),
  getAllUsers: (params) => api.get('/auth/admin/users', { params }),
  getUserById: (userId) => api.get(`/auth/admin/users/${userId}`),
  updateUser: (userId, data) => api.put(`/auth/admin/users/${userId}`, data),
  toggleUserStatus: (userId, isActive) => 
    api.put(`/auth/admin/users/${userId}/toggle-status`, { isActive })
};

export default adminAPI;