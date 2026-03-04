/**
 * In-memory offer timeout manager for sequential driver matching.
 * Tracks pending offer timeouts per booking and auto-rejects on expiry.
 */

const activeTimeouts = new Map(); // bookingId → timeoutId

/**
 * Set a timeout for a booking offer.
 * @param {String} bookingId
 * @param {Number} ms - Timeout in milliseconds (default 10s)
 * @param {Function} onExpire - Callback when offer expires
 */
function setOfferTimeout(bookingId, ms = 10000, onExpire) {
  clearOfferTimeout(bookingId); // Clear any existing timeout first
  const timeoutId = setTimeout(() => {
    activeTimeouts.delete(bookingId);
    console.log(`⏰ Offer timeout for booking ${bookingId}`);
    if (onExpire) onExpire(bookingId);
  }, ms);
  activeTimeouts.set(bookingId, timeoutId);
  console.log(`⏳ Set ${ms}ms offer timeout for booking ${bookingId}`);
}

/**
 * Clear timeout for a booking (on accept, reject, or cancel).
 * @param {String} bookingId
 */
function clearOfferTimeout(bookingId) {
  const timeoutId = activeTimeouts.get(bookingId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    activeTimeouts.delete(bookingId);
    console.log(`🔕 Cleared offer timeout for booking ${bookingId}`);
  }
}

/**
 * Check if a booking has a pending offer timeout.
 * @param {String} bookingId
 * @returns {Boolean}
 */
function hasActiveOffer(bookingId) {
  return activeTimeouts.has(bookingId);
}

module.exports = { setOfferTimeout, clearOfferTimeout, hasActiveOffer };
