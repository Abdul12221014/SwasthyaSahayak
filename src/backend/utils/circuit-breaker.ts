/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures by opening circuit when error threshold is reached.
 * Implements half-open state for recovery testing.
 * 
 * @module backend/utils/circuit-breaker
 */

export interface CircuitBreakerOptions {
  failureThreshold: number;      // Open circuit after N failures
  resetTimeoutMs: number;        // Time before attempting half-open
  halfOpenMaxAttempts: number;   // Max attempts in half-open state
  monitorWindowMs: number;        // Rolling window for failure tracking
}

export enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Blocking requests
  HALF_OPEN = 'half-open' // Testing recovery
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,      // 30 seconds
  halfOpenMaxAttempts: 3,
  monitorWindowMs: 60000      // 1 minute window
};

/**
 * Circuit Breaker for protecting against cascading failures
 */
export class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private halfOpenAttempts: number = 0;
  private failureWindow: number[] = []; // Timestamps of recent failures
  
  constructor(
    private options: CircuitBreakerOptions = DEFAULT_OPTIONS
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open and should remain open
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (this.nextAttemptTime && now < this.nextAttemptTime) {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`,
          this.getStats()
        );
      }
      // Time to attempt recovery - move to half-open
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenAttempts = 0;
    }

    // Execute the function
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record successful execution
   */
  private onSuccess(): void {
    const now = Date.now();
    this.lastSuccessTime = now;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
        // Recovery successful - close circuit
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.halfOpenAttempts = 0;
        this.nextAttemptTime = null;
        this.failureWindow = [];
      } else {
        this.successes++;
      }
    } else {
      // Reset failure count on success (CLOSED state)
      if (this.failures > 0) {
        this.failures = Math.max(0, this.failures - 1);
      }
      this.successes++;
    }
  }

  /**
   * Record failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    
    // Add to failure window
    this.failureWindow.push(now);
    
    // Clean old failures outside window
    const windowStart = now - this.options.monitorWindowMs;
    this.failureWindow = this.failureWindow.filter(time => time > windowStart);

    if (this.state === CircuitState.HALF_OPEN) {
      // Failure in half-open - immediately open again
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.options.resetTimeoutMs;
      this.halfOpenAttempts = 0;
      this.failures = this.failureWindow.length;
    } else {
      // CLOSED state - increment failures
      this.failures = this.failureWindow.length;
      
      if (this.failures >= this.options.failureThreshold) {
        // Open the circuit
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = now + this.options.resetTimeoutMs;
      }
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Reset circuit breaker to CLOSED state (manual reset)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.halfOpenAttempts = 0;
    this.nextAttemptTime = null;
    this.failureWindow = [];
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }

  /**
   * Check if circuit is closed (normal operation)
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }
}

/**
 * Custom error for circuit breaker
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public stats: CircuitBreakerStats
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Global circuit breaker instance for Gemini API
 */
let geminiCircuitBreaker: CircuitBreaker<any> | null = null;

/**
 * Get or create Gemini API circuit breaker
 */
export function getGeminiCircuitBreaker(): CircuitBreaker<any> {
  if (!geminiCircuitBreaker) {
    geminiCircuitBreaker = new CircuitBreaker({
      failureThreshold: 5,          // Open after 5 failures
      resetTimeoutMs: 30000,         // Wait 30s before retry
      halfOpenMaxAttempts: 2,        // Need 2 successes to close
      monitorWindowMs: 60000         // 1 minute failure window
    });
  }
  return geminiCircuitBreaker;
}
