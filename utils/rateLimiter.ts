/**
 * Rate limiting and throttling utilities
 * Prevents API abuse and excessive requests
 */

/**
 * Simple rate limiter using Map to track requests
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if request is allowed for given key
   * @param key - Unique identifier (e.g., userId)
   * @returns true if request is allowed, false otherwise
   */
  public isAllowed(key: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];

    // Filter out old requests outside the time window
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  /**
   * Get remaining requests for a key
   * @param key - Unique identifier
   * @returns Number of remaining requests
   */
  public getRemaining(key: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  /**
   * Get time until next request is allowed
   * @param key - Unique identifier
   * @returns Milliseconds until next request, or 0 if allowed now
   */
  public getRetryAfter(key: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (recentRequests.length < this.maxRequests) {
      return 0;
    }

    const oldestRequest = Math.min(...recentRequests);
    return Math.max(0, this.windowMs - (now - oldestRequest));
  }

  /**
   * Reset rate limit for a key
   * @param key - Unique identifier
   */
  public reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits (useful for testing)
   */
  public clear(): void {
    this.requests.clear();
  }
}

/**
 * Throttle function - ensures function is called at most once per interval
 * @param func - Function to throttle
 * @param delay - Minimum delay between calls in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null;
  let lastRun = 0;

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastRun >= delay) {
      func(...args);
      lastRun = now;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        func(...args);
        lastRun = Date.now();
      }, delay - (now - lastRun));
    }
  };
}

/**
 * Debounce function - delays execution until after delay milliseconds have passed
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      func(...args);
    }, delay);
  };
}

// Rate limiters for different operations
// 10 requests per minute for AI generation
export const aiGenerationLimiter = new RateLimiter(60000, 10);

// 20 requests per minute for grammar checks (lighter operation)
export const grammarCheckLimiter = new RateLimiter(60000, 20);

// 15 requests per minute for evaluations
export const evaluationLimiter = new RateLimiter(60000, 15);

/**
 * Check if AI generation request is rate-limited
 * @param userId - User ID
 * @returns Object with allowed status and retry time
 */
export const checkAiGenerationRateLimit = (userId: string): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
} => {
  const allowed = aiGenerationLimiter.isAllowed(userId);
  const remaining = aiGenerationLimiter.getRemaining(userId);
  const retryAfter = aiGenerationLimiter.getRetryAfter(userId);

  return { allowed, remaining, retryAfter };
};

/**
 * Check if grammar check request is rate-limited
 * @param userId - User ID
 * @returns Object with allowed status and retry time
 */
export const checkGrammarRateLimit = (userId: string): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
} => {
  const allowed = grammarCheckLimiter.isAllowed(userId);
  const remaining = grammarCheckLimiter.getRemaining(userId);
  const retryAfter = grammarCheckLimiter.getRetryAfter(userId);

  return { allowed, remaining, retryAfter };
};

/**
 * Format retry time in human-readable format
 * @param ms - Milliseconds
 * @returns Formatted string
 */
export const formatRetryTime = (ms: number): string => {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
};

export default RateLimiter;
