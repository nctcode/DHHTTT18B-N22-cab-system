const axios = require('axios');

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// Rate limiting: 1 request per second
let lastRequestTime = 0;
const MIN_INTERVAL = 1100;

async function rateLimitedGet(url) {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequestTime));
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestTime = Date.now();

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'CAB-Booking-System/1.0'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    throw error;
  }
}

exports.reverseGeocode = async (lat, lng) => {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;
  return await rateLimitedGet(url);
};

exports.searchPlaces = async (query, limit = 5) => {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=${limit}&countrycodes=vn`;
  return await rateLimitedGet(url);
};
