/**
 * Retry Logic with Exponential Backoff
 * 
 * Implements retry mechanism with exponential backoff for transient failures.
 * 
 * @module backend/utils/retry
 */

export interface RetryOptions {
  maxAttempts: number;           // Maximum retry attempts
  initialDelayMs: number;       // Initial delay before first retry
  maxDelayMs: number;           // Maximum delay cap
  backoffMultiplier: number;     // Exponential multiplier (default: 2)
  retryableErrors?: string[];    // Error patterns to retry on
  jitter?: boolean;              // Add random jitter to prevent thundering herd
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,         // 1 second
  maxDelayMs: 10000,            // 10 seconds max
  backoffMultiplier: 2,
  retryableErrors: [
    'timeout',
    'network',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    '503',                      // Service unavailable
    '429',                      // Rate limit
    '500'                       // Internal server error
  ],
  jitter: true
};

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, retryableErrors?: string[]): boolean {
  if (!retryableErrors || retryableErrors.length === 0) {
    return true; // Retry all errors by default
  }

  const errorMessage = error.message.toLowerCase();
  const errorStack = error.stack?.toLowerCase() || '';
  
  return retryableErrors.some(pattern => 
    errorMessage.includes(pattern.toLowerCase()) ||
    errorStack.includes(pattern.toLowerCase())
  );
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  multiplier: number,
  jitter: boolean
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  let delay = initialDelayMs * Math.pow(multiplier, attempt);
  
  // Cap at max delay
  delay = Math.min(delay, maxDelayMs);
  
  // Add jitter (random 0-25% of delay) to prevent thundering herd
  if (jitter) {
    const jitterAmount = delay * 0.25 * Math.random();
    delay = delay + jitterAmount;
  }
  
  return Math.round(delay);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      if (!isRetryableError(lastError, opts.retryableErrors)) {
        throw lastError; // Don't retry non-retryable errors
      }

      // Don't delay after last attempt
      if (attempt < opts.maxAttempts - 1) {
        const delay = calculateDelay(
          attempt,
          opts.initialDelayMs,
          opts.maxDelayMs,
          opts.backoffMultiplier,
          opts.jitter ?? true
        );
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Retry exhausted without error');
}

/**
 * Retry with custom delay function
 */
export async function retryWithCustomDelay<T>(
  fn: () => Promise<T>,
  delayFn: (attempt: number) => number,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxAttempts - 1) {
        const delay = delayFn(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Retry exhausted without error');
}

/**
 * Retry with timeout wrapper
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  retryOptions: Partial<RetryOptions> = {}
): Promise<T> {
  return retryWithBackoff(async () => {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([fn(), timeoutPromise]);
  }, retryOptions);
}
