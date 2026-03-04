/**
 * Execute a function with exponential backoff retry
 * @param {Function} fn Async function to execute
 * @param {Object} options Configuration options
 * @returns Promise
 */
const executeWithRetry = async (fn, options = {}) => {
  const maxAttempts = options.maxAttempts || 3;
  const baseDelay = options.baseDelay || 1000;
  const factor = options.factor || 2;

  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(factor, attempt - 1);
      console.log(`[Retry] Attempt ${attempt} failed. Retrying in ${delay}ms... Error: ${error.message}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
};

module.exports = { executeWithRetry };
