/**
 * Simple client-side rate limiter to prevent rapid successive operations
 * NOTE: This provides basic UI-level protection only. For production, implement
 * server-side rate limiting using Firebase App Check and Cloud Functions.
 */

class RateLimiter {
  constructor() {
    // Track last operation time per key
    this.lastOperationTime = new Map();
    // Track operation count per key in current window
    this.operationCounts = new Map();
    // Window duration in milliseconds (1 minute)
    this.windowDuration = 60000;
  }

  /**
   * Check if an operation is allowed based on rate limits
   * @param {string} key - Unique key for the operation (e.g., 'logUsage-vehicleId')
   * @param {number} minInterval - Minimum milliseconds between operations (default: 1000ms)
   * @param {number} maxPerWindow - Maximum operations per window (default: 10)
   * @returns {Object} { allowed: boolean, reason: string }
   */
  checkLimit(key, minInterval = 1000, maxPerWindow = 10) {
    const now = Date.now();
    const lastTime = this.lastOperationTime.get(key) || 0;
    const timeSinceLastOp = now - lastTime;

    // Check minimum interval between operations
    if (timeSinceLastOp < minInterval) {
      const waitTime = Math.ceil((minInterval - timeSinceLastOp) / 1000);
      return {
        allowed: false,
        reason: `Please wait ${waitTime} second${waitTime !== 1 ? 's' : ''} before trying again.`
      };
    }

    // Check operations per window
    const counts = this.operationCounts.get(key) || [];
    // Remove operations outside the current window
    const recentOps = counts.filter(time => now - time < this.windowDuration);

    if (recentOps.length >= maxPerWindow) {
      return {
        allowed: false,
        reason: `Too many operations. Please wait a minute before trying again.`
      };
    }

    return { allowed: true };
  }

  /**
   * Record that an operation was performed
   * @param {string} key - Unique key for the operation
   */
  recordOperation(key) {
    const now = Date.now();
    this.lastOperationTime.set(key, now);

    // Update operation counts
    const counts = this.operationCounts.get(key) || [];
    counts.push(now);
    // Keep only operations within the current window
    const recentOps = counts.filter(time => now - time < this.windowDuration);
    this.operationCounts.set(key, recentOps);
  }

  /**
   * Clear rate limit data for a specific key
   * @param {string} key - Unique key to clear
   */
  clear(key) {
    this.lastOperationTime.delete(key);
    this.operationCounts.delete(key);
  }

  /**
   * Clear all rate limit data
   */
  clearAll() {
    this.lastOperationTime.clear();
    this.operationCounts.clear();
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Hook to use rate limiting in React components
 * @param {string} operationKey - Unique key for this operation
 * @param {Object} options - Rate limiting options
 * @returns {Function} Function to check if operation is allowed
 */
export function useRateLimit(operationKey, options = {}) {
  const { minInterval = 1000, maxPerWindow = 10 } = options;

  return {
    /**
     * Check if operation is allowed
     * @returns {Object} { allowed: boolean, reason: string }
     */
    checkLimit: () => rateLimiter.checkLimit(operationKey, minInterval, maxPerWindow),

    /**
     * Record that operation was performed
     */
    recordOperation: () => rateLimiter.recordOperation(operationKey),

    /**
     * Clear rate limit for this operation
     */
    clear: () => rateLimiter.clear(operationKey)
  };
}
