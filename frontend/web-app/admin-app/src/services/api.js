import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('admin_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
    localStorage.removeItem('admin_token');
    if (window.location.pathname !== '/login') window.location.href = '/login';
  }
  return Promise.reject(err);
});

// Auth
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// Users
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
};

// Drivers
export const driversAPI = {
  getAll: () => api.get('/drivers'),
  getById: (id) => api.get(`/drivers/${id}`),
};

// Rides
export const ridesAPI = {
  getAll: () => api.get('/rides/all'),
  getById: (id) => api.get(`/rides/${id}`),
};

// Payments
export const paymentsAPI = {
  getAll: () => api.get('/payments'),
};

// Pricing
export const pricingAPI = {
  getRules: () => api.get('/pricing/rules'),
  updateRule: (id, data) => api.put(`/pricing/rules/${id}`, data),
  getSurge: () => api.get('/pricing/surge-zones'),
  updateSurge: (id, data) => api.put(`/pricing/surge-zones/${id}`, data),
};

// Reviews
export const reviewsAPI = {
  getByUser: (userId) => api.get(`/reviews/user/${userId}`),
};

export default api;
