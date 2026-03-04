// backend/shared/resilience/retry.js
/**
 * Retry Pattern with Exponential Backoff
 * Handles transient failures gracefully
 */

const axios = require('axios');
const axiosRetry = require('axios-retry');

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors
    if (axiosRetry.isNetworkError(error)) {
      return true;
    }

    // Retry on 5xx errors
    if (axiosRetry.isRetryableError(error)) {
      return true;
    }

    // Retry on specific error codes
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Don't retry on 4xx errors (client errors)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }

    return false;
  },
  shouldResetTimeout: true,
  onRetry: (retryCount, error, requestConfig) => {
    console.warn(`Retry attempt ${retryCount} for ${requestConfig.url}`, {
      error: error.message,
      code: error.code,
      status: error.response?.status
    });
  }
};

/**
 * Create an axios instance with retry capability
 * @param {Object} baseConfig - Base axios configuration
 * @param {Object} retryConfig - Retry configuration
 * @returns {AxiosInstance}
 */
const createRetryableAxios = (baseConfig = {}, retryConfig = {}) => {
  const instance = axios.create(baseConfig);
  
  axiosRetry(instance, {
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig
  });

  return instance;
};

/**
 * Exponential backoff with jitter
 * Prevents thundering herd problem
 * @param {number} retryNumber - Current retry attempt (0-indexed)
 * @param {number} baseDelay - Base delay in ms (default: 100)
 * @param {number} maxDelay - Maximum delay in ms (default: 30000)
 * @returns {number} Delay in milliseconds
 */
const exponentialBackoffWithJitter = (retryNumber, baseDelay = 100, maxDelay = 30000) => {
  const delay = Math.min(baseDelay * Math.pow(2, retryNumber), maxDelay);
  const jitter = Math.random() * delay * 0.1; // 10% jitter
  return delay + jitter;
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function
 */
const retryWithBackoff = async (fn, options = {}) => {
  const {
    retries = 3,
    baseDelay = 100,
    maxDelay = 30000,
    onRetry = () => {},
    shouldRetry = () => true
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt >= retries) {
        break;
      }

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        break;
      }

      // Calculate delay
      const delay = exponentialBackoffWithJitter(attempt, baseDelay, maxDelay);

      // Callback
      onRetry(attempt + 1, error, delay);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Retry configuration for database operations
 */
const DATABASE_RETRY_CONFIG = {
  retries: 5,
  baseDelay: 100,
  maxDelay: 2000,
  shouldRetry: (error) => {
    // Retry on connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Retry on lock timeouts
    if (error.message && error.message.includes('lock timeout')) {
      return true;
    }

    // Retry on deadlock
    if (error.code === 'ER_LOCK_DEADLOCK') {
      return true;
    }

    return false;
  }
};

/**
 * Retry database operation
 * @param {Function} operation - Database operation
 * @returns {Promise}
 */
const retryDatabaseOperation = (operation) => {
  return retryWithBackoff(operation, DATABASE_RETRY_CONFIG);
};

/**
 * Retry configuration for message queue operations
 */
const QUEUE_RETRY_CONFIG = {
  retries: 10,
  baseDelay: 500,
  maxDelay: 60000,
  shouldRetry: (error) => {
    // Always retry queue operations
    return true;
  },
  onRetry: (attempt, error, delay) => {
    console.warn(`Queue operation retry ${attempt}`, {
      error: error.message,
      nextRetryIn: `${delay}ms`
    });
  }
};

/**
 * Dead Letter Queue handler
 * For messages that fail after all retries
 */
class DeadLetterQueue {
  constructor(storage) {
    this.storage = storage || [];
  }

  /**
   * Add failed message to DLQ
   */
  async add(message, error, metadata = {}) {
    const dlqEntry = {
      message,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      metadata: {
        ...metadata,
        failedAt: new Date().toISOString(),
        retries: metadata.retries || 0
      }
    };

    this.storage.push(dlqEntry);
    
    console.error('Message added to DLQ:', {
      messageId: metadata.messageId,
      error: error.message
    });

    return dlqEntry;
  }

  /**
   * Get all DLQ entries
   */
  getAll() {
    return this.storage;
  }

  /**
   * Retry a DLQ entry
   */
  async retry(index, handler) {
    const entry = this.storage[index];
    
    if (!entry) {
      throw new Error('DLQ entry not found');
    }

    try {
      await handler(entry.message);
      
      // Remove from DLQ on success
      this.storage.splice(index, 1);
      
      return { success: true };
    } catch (error) {
      entry.metadata.retries = (entry.metadata.retries || 0) + 1;
      entry.metadata.lastRetryAt = new Date().toISOString();
      entry.error = {
        message: error.message,
        stack: error.stack
      };

      return { success: false, error };
    }
  }

  /**
   * Clear DLQ
   */
  clear() {
    this.storage = [];
  }
}

/**
 * Timeout wrapper for promises
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} message - Error message
 * @returns {Promise}
 */
const withTimeout = (promise, timeoutMs, message = 'Operation timed out') => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeoutMs)
    )
  ]);
};

module.exports = {
  createRetryableAxios,
  exponentialBackoffWithJitter,
  retryWithBackoff,
  retryDatabaseOperation,
  withTimeout,
  DeadLetterQueue,
  DEFAULT_RETRY_CONFIG,
  DATABASE_RETRY_CONFIG,
  QUEUE_RETRY_CONFIG
};
