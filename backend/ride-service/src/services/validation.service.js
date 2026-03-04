/**
 * Validate IDs against real data in booking-service, user-service, driver-service.
 * Rejects fake or non-existent IDs.
 */
const axios = require('axios');

const BOOKING_SERVICE_URL =
  process.env.BOOKING_SERVICE_URL || 'http://booking-service:3004';
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || 'http://user-service:3002';
const DRIVER_SERVICE_URL =
  process.env.DRIVER_SERVICE_URL || 'http://driver-service:3003';

const http = axios.create({
  timeout: 10000,
  validateStatus: () => true,
});

/**
 * @returns {{ valid: boolean, message?: string }}
 */
async function validateBookingId(bookingId) {
  const out = await getBookingById(bookingId);
  if (!out.success) return { valid: false, message: out.message };
  return { valid: true };
}

/**
 * Get booking by id (internal). Returns userId for ride creation.
 * @returns {{ success: boolean, data?: { id, userId, status }, message?: string }}
 */
async function getBookingById(bookingId) {
  if (!bookingId || typeof bookingId !== 'string' || !bookingId.trim()) {
    return { success: false, message: 'Booking ID is required' };
  }
  if (!bookingId.startsWith('booking_')) {
    return { success: false, message: 'Invalid booking ID format' };
  }
  try {
    const res = await http.get(
      `${BOOKING_SERVICE_URL}/internal/bookings/${encodeURIComponent(bookingId)}`
    );
    if (res.status === 404 || !res.data?.success) {
      return { success: false, message: 'Booking not found' };
    }
    return { success: true, data: res.data.data };
  } catch (err) {
    console.error('getBookingById error:', err.message);
    return {
      success: false,
      message: 'Could not verify booking. Booking service may be unavailable.',
    };
  }
}

/**
 * @returns {{ valid: boolean, message?: string }}
 */
async function validateUserId(userId) {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return { valid: false, message: 'User ID is required' };
  }
  try {
    const res = await http.get(
      `${USER_SERVICE_URL}/users/${encodeURIComponent(userId)}`
    );
    if (res.status === 404 || !res.data?.success) {
      return { valid: false, message: 'User not found' };
    }
    return { valid: true };
  } catch (err) {
    console.error('Validation userId error:', err.message);
    return {
      valid: false,
      message: 'Could not verify user. User service may be unavailable.',
    };
  }
}

/**
 * @returns {{ valid: boolean, message?: string }}
 */
async function validateDriverId(driverId) {
  const out = await getDriverById(driverId);
  if (!out.valid) return out;
  return { valid: true };
}

/**
 * Get driver by id and check ONLINE for assign.
 * @returns {{ valid: boolean, message?: string, data?: object }}
 */
async function getDriverById(driverId) {
  if (!driverId || typeof driverId !== 'string' || !driverId.trim()) {
    return { valid: false, message: 'Driver ID is required' };
  }
  if (driverId === 'string' || driverId.length < 10) {
    return { valid: false, message: 'Invalid driver ID' };
  }
  try {
    const res = await http.get(
      `${DRIVER_SERVICE_URL}/drivers/${encodeURIComponent(driverId)}`
    );
    if (res.status === 404 || !res.data?.success) {
      return { valid: false, message: 'Driver not found' };
    }
    return { valid: true, data: res.data.data };
  } catch (err) {
    console.error('getDriverById error:', err.message);
    return {
      valid: false,
      message: 'Could not verify driver. Driver service may be unavailable.',
    };
  }
}

/** Check driver exists and status is ONLINE */
async function validateDriverOnline(driverId) {
  const out = await getDriverById(driverId);
  if (!out.valid) return out;
  const status = (out.data?.status || '').toUpperCase();
  if (status !== 'ONLINE') {
    return { valid: false, message: 'Driver must be ONLINE to be assigned' };
  }
  return { valid: true };
}

module.exports = {
  validateBookingId,
  validateUserId,
  validateDriverId,
  validateDriverOnline,
  getBookingById,
  getDriverById,
};
