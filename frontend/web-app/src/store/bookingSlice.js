import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { bookingService } from '../services/booking';

// Các async thunks CẦN THIẾT cho customer booking
export const createBooking = createAsyncThunk(
  'booking/create',
  async (bookingData, { rejectWithValue }) => {
    try {
      const response = await bookingService.createBooking(bookingData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getBookings = createAsyncThunk(
  'booking/getAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await bookingService.getBookings(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Các async thunks KHÁC (giữ nguyên nếu có)
export const updateBookingStatus = createAsyncThunk(
  'booking/updateStatus',
  async ({ id, status, action }, { rejectWithValue }) => {
    try {
      const response = await bookingService.updateBooking(id, { status, action });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getDriverBookings = createAsyncThunk(
  'booking/getDriverBookings',
  async (params, { rejectWithValue }) => {
    try {
      const response = await bookingService.getDriverBookings(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState: {
    bookings: [],
    driverBookings: [],
    availableBookings: [],
    currentBooking: null,
    loading: false,
    error: null,
    statusUpdateLoading: false,
  },
  reducers: {
    clearBookingError: (state) => {
      state.error = null;
    },
    setCurrentBooking: (state, action) => {
      state.currentBooking = action.payload;
    },
    addAvailableBooking: (state, action) => {
      state.availableBookings.push(action.payload);
    },
    removeAvailableBooking: (state, action) => {
      state.availableBookings = state.availableBookings.filter(
        booking => booking.id !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Create booking
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings.push(action.payload);
        state.currentBooking = action.payload;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get bookings
      .addCase(getBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
      })
      .addCase(getBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update booking status
      .addCase(updateBookingStatus.pending, (state) => {
        state.statusUpdateLoading = true;
        state.error = null;
      })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        state.statusUpdateLoading = false;
        
        // Update in all bookings arrays
        const updateInArray = (array) => 
          array.map(booking => 
            booking.id === action.payload.id ? action.payload : booking
          );
        
        state.bookings = updateInArray(state.bookings);
        state.driverBookings = updateInArray(state.driverBookings);
        state.availableBookings = updateInArray(state.availableBookings);
        
        if (state.currentBooking?.id === action.payload.id) {
          state.currentBooking = action.payload;
        }
      })
      .addCase(updateBookingStatus.rejected, (state, action) => {
        state.statusUpdateLoading = false;
        state.error = action.payload;
      })
      
      // Get driver bookings
      .addCase(getDriverBookings.fulfilled, (state, action) => {
        state.driverBookings = action.payload;
      });
  },
});

export const { 
  clearBookingError, 
  setCurrentBooking, 
  addAvailableBooking, 
  removeAvailableBooking 
} = bookingSlice.actions;

export default bookingSlice.reducer;