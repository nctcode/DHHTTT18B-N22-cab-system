import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authAPI from '../services/auth';

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const getProfile = createAsyncThunk(
  'auth/getProfile',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Kiểm tra nếu đang loading thì không gọi lại
      const state = getState();
      if (state.auth.loading) {
        return rejectWithValue('Already loading');
      }
      
      // Thêm delay nhỏ để tránh rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await authAPI.getProfile();
      return response.data;
    } catch (error) {
      // Xử lý rate limit error cụ thể
      if (error.response?.status === 429) {
        return rejectWithValue('Too many requests. Please wait a moment.');
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to get profile');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

const loadStateFromStorage = () => {
  try {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return null;
    
    // Decode token để lấy thông tin user
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    
    return {
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        // Có thể cần fetch thêm thông tin từ API
      },
      accessToken,
      refreshToken: localStorage.getItem('refresh_token'),
      isAuthenticated: true,
      role: payload.role,
      loading: false,
      error: null
    };
  } catch (error) {
    console.error('Error loading state from storage:', error);
    return null;
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: loadStateFromStorage() || {
    user: null,
    accessToken: localStorage.getItem('access_token') || null,
    refreshToken: localStorage.getItem('refresh_token') || null,
    loading: false,
    error: null,
    isAuthenticated: !!localStorage.getItem('access_token'),
    role: (() => {
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role || payload.userRole || null;
      } catch {
        return null;
      }
    })()
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('remembered_email');
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      state.role = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.role = action.payload?.role || null;
    },
    setRole: (state, action) => {
      state.role = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data?.user || null;
        state.accessToken = action.payload.data?.tokens?.accessToken || null;
        state.refreshToken = action.payload.data?.tokens?.refreshToken || null;
        state.isAuthenticated = true;
        state.role = action.payload.data?.user?.role || null;
        
        if (state.accessToken) {
          localStorage.setItem('access_token', state.accessToken);
          
          // Try to extract role from token if not in response
          if (!state.role) {
            try {
              const payload = JSON.parse(atob(state.accessToken.split('.')[1]));
              state.role = payload.role || payload.userRole || null;
            } catch {
              // Keep the role as is
            }
          }
        }
        if (state.refreshToken) {
          localStorage.setItem('refresh_token', state.refreshToken);
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.role = null;
      })
      
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data?.user || null;
        state.accessToken = action.payload.data?.tokens?.accessToken || null;
        state.refreshToken = action.payload.data?.tokens?.refreshToken || null;
        state.isAuthenticated = true;
        state.role = action.payload.data?.user?.role || null;
        
        if (state.accessToken) {
          localStorage.setItem('access_token', state.accessToken);
          
          // Try to extract role from token if not in response
          if (!state.role) {
            try {
              const payload = JSON.parse(atob(state.accessToken.split('.')[1]));
              state.role = payload.role || payload.userRole || null;
            } catch {
              // Keep the role as is
            }
          }
        }
        if (state.refreshToken) {
          localStorage.setItem('refresh_token', state.refreshToken);
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Profile
      .addCase(getProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data || state.user;
        state.role = action.payload.data?.role || state.role;
      })
      .addCase(getProfile.rejected, (state) => {
        state.loading = false;
      })
      
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        // Cập nhật user data mới
        state.user = { ...state.user, ...action.payload.data };
        state.role = action.payload.data?.role || state.role;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { logout, clearError, setUser, setRole } = authSlice.actions;
export default authSlice.reducer;