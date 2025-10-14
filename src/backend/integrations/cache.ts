/**
 * Simple In-Memory LRU Cache
 * 
 * Caches embeddings and RAG results to reduce ML service calls.
 * Implements TTL and size-based eviction.
 * 
 * @module backend/integrations/cache
 */

export interface CacheOptions {
  maxSize?: number;      // Maximum cache entries (default: 1000)
  ttlMs?: number;        // Time to live in milliseconds (default: 30 min)
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttlMs: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.ttlMs = options.ttlMs || 30 * 60 * 1000; // 30 minutes default
  }

  /**
   * Normalize cache key (trim, lowercase, remove extra spaces)
   */
  private normalizeKey(key: string): string {
    return key.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.ttlMs;
  }

  /**
   * Evict oldest/least accessed entry
   */
  private evictOne(): void {
    if (this.cache.size === 0) return;

    // Find LRU entry (oldest with lowest access count)
    let lruKey: string | null = null;
    let minAccessCount = Infinity;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < minAccessCount || 
          (entry.accessCount === minAccessCount && entry.timestamp < oldestTime)) {
        lruKey = key;
        minAccessCount = entry.accessCount;
        oldestTime = entry.timestamp;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.cache.get(normalizedKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(normalizedKey);
      return null;
    }

    // Update access count
    entry.accessCount++;
    
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    const normalizedKey = this.normalizeKey(key);

    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(normalizedKey)) {
      this.evictOne();
    }

    this.cache.set(normalizedKey, {
      value,
      timestamp: Date.now(),
      accessCount: 0
    });
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): number {
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }
}

// Global caches
export const embeddingCache = new LRUCache<number[]>({
  maxSize: 500,
  ttlMs: 30 * 60 * 1000 // 30 minutes
});

export const retrievalCache = new LRUCache<any[]>({
  maxSize: 200,
  ttlMs: 10 * 60 * 1000 // 10 minutes
});

// Periodic cleanup (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const embeddingCleaned = embeddingCache.cleanup();
    const retrievalCleaned = retrievalCache.cleanup();
    if (embeddingCleaned + retrievalCleaned > 0) {
      console.log(`Cache cleanup: ${embeddingCleaned} embeddings, ${retrievalCleaned} retrievals`);
    }
  }, 5 * 60 * 1000);
}

