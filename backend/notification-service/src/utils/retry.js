/**
 * Exponential backoff retry utility
 */
const executeWithRetry = async (fn, options = {}) => {
  const maxAttempts = options.maxAttempts || 5;
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
      console.log(`[Retry] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
};

module.exports = { executeWithRetry };
