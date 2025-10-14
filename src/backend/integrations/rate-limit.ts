/**
 * Rate Limiter
 * 
 * Lightweight in-memory rate limiting to prevent abuse.
 * Tracks requests by phone number or IP address.
 * 
 * @module backend/integrations/rate-limit
 */

export interface RateLimitOptions {
  windowMs?: number;     // Time window in milliseconds (default: 10 min)
  maxRequests?: number;  // Max requests per window (default: 20)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  message?: string;
}

interface RequestRecord {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

export class RateLimiter {
  private requests: Map<string, RequestRecord>;
  private windowMs: number;
  private maxRequests: number;

  constructor(options: RateLimitOptions = {}) {
    this.requests = new Map();
    this.windowMs = options.windowMs || 10 * 60 * 1000; // 10 minutes
    this.maxRequests = options.maxRequests || 20;

    // Cleanup old entries every minute
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 1000);
    }
  }

  /**
   * Normalize identifier (phone number or IP)
   */
  private normalizeId(identifier: string): string {
    // Remove whitespace, normalize phone numbers
    return identifier.trim().replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Check if request is allowed
   */
  check(identifier: string): RateLimitResult {
    const id = this.normalizeId(identifier);
    const now = Date.now();
    const record = this.requests.get(id);

    // First request or outside window
    if (!record || (now - record.firstRequest) > this.windowMs) {
      this.requests.set(id, {
        count: 1,
        firstRequest: now,
        lastRequest: now
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: new Date(now + this.windowMs)
      };
    }

    // Within window - check limit
    if (record.count >= this.maxRequests) {
      const resetAt = new Date(record.firstRequest + this.windowMs);
      const waitMinutes = Math.ceil((resetAt.getTime() - now) / 60000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        message: `Too many requests. Please wait ${waitMinutes} minute(s) before trying again. For urgent medical needs, call 108 or visit your nearest health center.`
      };
    }

    // Increment counter
    record.count++;
    record.lastRequest = now;
    this.requests.set(id, record);

    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetAt: new Date(record.firstRequest + this.windowMs)
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    const id = this.normalizeId(identifier);
    this.requests.delete(id);
  }

  /**
   * Cleanup expired records
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, record] of this.requests.entries()) {
      if ((now - record.firstRequest) > this.windowMs) {
        this.requests.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get current stats
   */
  stats() {
    return {
      activeUsers: this.requests.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests
    };
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '600000'), // 10 min
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '20')
});

