import api from './api';

const authAPI = {
  // Register
  register: (userData) => 
    api.post('/auth/register', userData),

  // Login
  login: (credentials) => 
    api.post('/auth/login', credentials),

  // Get profile
  getProfile: () => 
    api.get('/auth/profile'),

  // Update profile
  updateProfile: (profileData) => 
    api.put('/auth/profile/update', profileData),

  // Request password reset
  requestPasswordReset: (email) => 
    api.post('/auth/request-password-reset', { email }),

  // Reset password
  resetPassword: (token, newPassword) => 
    api.post('/auth/reset-password', { token, newPassword }),

  changePassword: (passwords) => 
    api.post('/auth/change-password', passwords),
  
  // Refresh token
  refreshToken: (refreshToken) => 
    api.post('/auth/refresh-token', { refreshToken }),

  // Logout
  logout: (refreshToken) => 
    api.post('/auth/logout', { refreshToken }),

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('access_token');
    return !!token;
  }
};



export default authAPI;