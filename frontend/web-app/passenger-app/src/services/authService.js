import api from './api';

export const authService = {
  // Register new user
  // Backend expects: { password, fullName, phone, email, role }
  // Backend returns: { success, message, data: { userId, email, role }, accessToken, refreshToken }
  register: async (userData) => {
    const response = await api.post('/api/auth/register', {
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
      role: userData.role || 'PASSENGER'
    });
    return response.data;
  },

  // Login
  // Backend expects: { email, password }
  // Backend returns: { success, message, data: { userId, email, role }, accessToken, refreshToken }
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const result = response.data;

    if (result.accessToken) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);

      const user = {
        id: result.data?.userId || null,
        email: result.data?.email || email,
        role: result.data?.role || 'PASSENGER',
      };

      localStorage.setItem('user', JSON.stringify(user));

      return { ...result, user };
    }

    return result;
  },

  // Logout
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/api/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.clear();
    }
  },

  // Refresh token
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post('/api/auth/refresh', { refreshToken });
    const result = response.data;

    if (result.accessToken) {
      localStorage.setItem('accessToken', result.accessToken);
    }
    if (result.refreshToken) {
      localStorage.setItem('refreshToken', result.refreshToken);
    }

    return result;
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get current user profile from backend
  getMe: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },
};

export default authService;
