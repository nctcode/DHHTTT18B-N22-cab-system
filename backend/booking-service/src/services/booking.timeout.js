/**
 * In-memory timeout manager for sequential driver matching.
 * Tracks pending offer timeouts and global search timeouts per booking.
 */

const offerTimeouts = new Map(); // bookingId → timeoutId
const globalTimeouts = new Map(); // bookingId → timeoutId

/**
 * Set a timeout for a single driver offer.
 * @param {String} bookingId
 * @param {Number} ms - Timeout in milliseconds (default 10s)
 * @param {Function} onExpire - Callback when offer expires
 */
function setOfferTimeout(bookingId, ms = 10000, onExpire) {
  clearOfferTimeout(bookingId);
  const timeoutId = setTimeout(() => {
    offerTimeouts.delete(bookingId);
    console.log(`⏰ Offer timeout for booking ${bookingId}`);
    if (onExpire) onExpire(bookingId);
  }, ms);
  offerTimeouts.set(bookingId, timeoutId);
  console.log(`⏳ Set ${ms}ms offer timeout for booking ${bookingId}`);
}

/**
 * Clear offer timeout for a booking.
 */
function clearOfferTimeout(bookingId) {
  const timeoutId = offerTimeouts.get(bookingId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    offerTimeouts.delete(bookingId);
    console.log(`🔕 Cleared offer timeout for booking ${bookingId}`);
  }
}

/**
 * Set a global search timeout for the entire booking process.
 * @param {String} bookingId
 * @param {Number} ms - Global timeout in milliseconds (default 15s)
 * @param {Function} onExpire - Callback when global timeout expires
 */
function setGlobalSearchTimeout(bookingId, ms = 15000, onExpire) {
  clearGlobalSearchTimeout(bookingId);
  const timeoutId = setTimeout(() => {
    globalTimeouts.delete(bookingId);
    console.log(`🕒 GLOBAL search timeout for booking ${bookingId}`);
    if (onExpire) onExpire(bookingId);
  }, ms);
  globalTimeouts.set(bookingId, timeoutId);
  console.log(`🌎 Set ${ms}ms global search timeout for booking ${bookingId}`);
}

/**
 * Clear global search timeout for a booking.
 */
function clearGlobalSearchTimeout(bookingId) {
  const timeoutId = globalTimeouts.get(bookingId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    globalTimeouts.delete(bookingId);
    console.log(`🚫 Cleared global search timeout for booking ${bookingId}`);
  }
}

/**
 * Clear all timeouts for a booking (on matched or cancelled).
 */
function clearAllBookingTimeouts(bookingId) {
  clearOfferTimeout(bookingId);
  clearGlobalSearchTimeout(bookingId);
}

module.exports = { 
  setOfferTimeout, 
  clearOfferTimeout, 
  setGlobalSearchTimeout, 
  clearGlobalSearchTimeout,
  clearAllBookingTimeouts
};
