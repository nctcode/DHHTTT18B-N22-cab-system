// backend/api-gateway/src/utils/pricingRetry.js
/**
 * Pricing Service Retry & Fallback Helper
 * 
 * Implements:
 * - Max 3 retries with exponential backoff (300ms → 600ms → 1000ms)
 * - 1500ms request timeout
 * - Retry on network errors (ECONNREFUSED, EAI_AGAIN, timeout) and HTTP 5xx
 * - Graceful fallback response when all retries fail
 */

const axios = require('axios');
const logger = require('./logger');

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  delays: [300, 600, 1000], // Exponential backoff delays in ms
  timeout: 1500,            // Request timeout in ms
};

// Errors that should trigger a retry
const RETRYABLE_NETWORK_CODES = ['ECONNREFUSED', 'EAI_AGAIN', 'ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND'];

/**
 * Fallback response returned when the Pricing Service is completely unavailable
 */
const PRICING_FALLBACK = {
  price: null,
  currency: 'VND',
  isFallback: true,
  message: 'Pricing service unavailable, using fallback',
};

/**
 * Determine whether an error is retryable
 * @param {Error} error - Axios error
 * @returns {boolean}
 */
function isRetryableError(error) {
  // Network-level errors (ECONNREFUSED, timeout, DNS failure, etc.)
  if (error.code && RETRYABLE_NETWORK_CODES.includes(error.code)) {
    return true;
  }

  // Axios timeout
  if (error.message && error.message.toLowerCase().includes('timeout')) {
    return true;
  }

  // HTTP 5xx server errors
  if (error.response && error.response.status >= 500) {
    return true;
  }

  return false;
}

/**
 * Sleep utility
 * @param {number} ms - milliseconds to wait
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call Pricing Service with retry and fallback
 * 
 * @param {object} payload - The pricing request body (distance_km, duration_min, vehicle_type, etc.)
 * @param {string} pricingUrl - Base URL of the pricing service
 * @param {string} [endpoint='/pricing/estimate'] - Pricing endpoint path
 * @returns {Promise<object>} - Pricing response or fallback
 */
async function callPricingWithRetry(payload, pricingUrl, endpoint = '/pricing/estimate') {
  const url = `${pricingUrl}${endpoint}`;
  
  logger.info(`[Pricing] Request started`, { url, payload });

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const response = await axios.post(url, payload, {
        timeout: RETRY_CONFIG.timeout,
        headers: { 'Content-Type': 'application/json' },
      });

      // Success — return immediately
      logger.info(`[Pricing] Request succeeded on attempt ${attempt}`, {
        status: response.status,
      });

      return {
        success: true,
        data: response.data?.data || response.data,
        isFallback: false,
      };

    } catch (error) {
      const errorInfo = {
        attempt,
        maxRetries: RETRY_CONFIG.maxRetries,
        code: error.code || null,
        status: error.response?.status || null,
        message: error.message,
      };

      logger.warn(`[Retry] Pricing attempt ${attempt}/${RETRY_CONFIG.maxRetries} failed`, errorInfo);

      // If the error is NOT retryable, go straight to fallback
      if (!isRetryableError(error)) {
        logger.warn(`[Retry] Non-retryable error, skipping remaining retries`, errorInfo);
        break;
      }

      // If there are more attempts remaining, wait before retrying
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.delays[attempt - 1] || RETRY_CONFIG.delays[RETRY_CONFIG.delays.length - 1];
        logger.info(`[Retry] Waiting ${delay}ms before next attempt...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted — return fallback
  logger.warn(`[Fallback] Pricing service unavailable after ${RETRY_CONFIG.maxRetries} attempts. Using fallback response.`);
  
  return {
    success: true,
    data: { ...PRICING_FALLBACK },
    isFallback: true,
  };
}

module.exports = {
  callPricingWithRetry,
  PRICING_FALLBACK,
  RETRY_CONFIG,
  isRetryableError,
  // Exported for testing
  _test: { sleep, RETRYABLE_NETWORK_CODES },
};
