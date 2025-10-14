/**
 * Metrics Collection
 * 
 * In-process counters and histograms for observability.
 * Exposes metrics when OBS_ENABLE_METRICS=true.
 * 
 * @module backend/utils/metrics
 */

interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface Counter {
  name: string;
  description: string;
  value: number;
  labels: Record<string, number>;
}

interface Histogram {
  name: string;
  description: string;
  buckets: number[];
  values: number[];
  count: number;
  sum: number;
}

class MetricsCollector {
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private enableMetrics: boolean;

  constructor() {
    this.enableMetrics = Deno.env.get('OBS_ENABLE_METRICS') === 'true';
    this.initializeMetrics();
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics() {
    // RAG metrics
    this.createCounter('rag_requests_total', 'Total number of RAG requests');
    this.createHistogram('rag_latency_ms_hist', 'RAG request latency in milliseconds', [100, 500, 1000, 2000, 5000]);
    
    // Cache metrics
    this.createCounter('cache_hit_total', 'Total cache hits');
    this.createCounter('cache_miss_total', 'Total cache misses');
    
    // Webhook metrics
    this.createCounter('webhook_fail_total', 'Total webhook failures');
    this.createCounter('webhook_success_total', 'Total webhook successes');
    this.createHistogram('webhook_latency_ms_hist', 'Webhook processing latency', [100, 500, 1000, 2000, 5000]);
    
    // Government API metrics
    this.createCounter('gov_api_requests_total', 'Total government API requests');
    this.createCounter('gov_api_failures_total', 'Total government API failures');
    
    // PHC lookup metrics
    this.createCounter('phc_lookup_total', 'Total PHC lookups');
    this.createHistogram('phc_lookup_latency_ms_hist', 'PHC lookup latency', [50, 100, 200, 500, 1000]);
    
    // Health check metrics
    this.createCounter('health_check_total', 'Total health checks');
    this.createCounter('health_check_failures_total', 'Total health check failures');
  }

  /**
   * Create a counter metric
   */
  createCounter(name: string, description: string) {
    this.counters.set(name, {
      name,
      description,
      value: 0,
      labels: {}
    });
  }

  /**
   * Create a histogram metric
   */
  createHistogram(name: string, description: string, buckets: number[]) {
    this.histograms.set(name, {
      name,
      description,
      buckets,
      values: [],
      count: 0,
      sum: 0
    });
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, labels: Record<string, string> = {}) {
    if (!this.enableMetrics) return;
    
    const counter = this.counters.get(name);
    if (counter) {
      counter.value++;
      // Store labels for grouping (simplified implementation)
      const labelKey = JSON.stringify(labels);
      counter.labels[labelKey] = (counter.labels[labelKey] || 0) + 1;
    }
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}) {
    if (!this.enableMetrics) return;
    
    const histogram = this.histograms.get(name);
    if (histogram) {
      histogram.values.push(value);
      histogram.count++;
      histogram.sum += value;
      
      // Keep only recent values (last 1000)
      if (histogram.values.length > 1000) {
        histogram.values = histogram.values.slice(-1000);
      }
    }
  }

  /**
   * Get counter value
   */
  getCounterValue(name: string): number {
    const counter = this.counters.get(name);
    return counter ? counter.value : 0;
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string): { count: number; sum: number; avg: number; p50: number; p95: number; p99: number } {
    const histogram = this.histograms.get(name);
    if (!histogram || histogram.values.length === 0) {
      return { count: 0, sum: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...histogram.values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avg = sum / count;
    
    const p50 = sorted[Math.floor(count * 0.5)];
    const p95 = sorted[Math.floor(count * 0.95)];
    const p99 = sorted[Math.floor(count * 0.99)];

    return { count, sum, avg, p50, p95, p99 };
  }

  /**
   * Get all metrics in Prometheus format
   */
  getMetricsPrometheus(): string {
    if (!this.enableMetrics) return '# Metrics disabled\n';

    let output = '# HELP Metrics for SwasthyaSahayak\n# TYPE metrics counter\n\n';

    // Export counters
    for (const [name, counter] of this.counters) {
      output += `# HELP ${name} ${counter.description}\n`;
      output += `# TYPE ${name} counter\n`;
      output += `${name} ${counter.value}\n`;
      
      // Export labeled counters
      for (const [labelKey, value] of Object.entries(counter.labels)) {
        const labels = labelKey !== '{}' ? `{${labelKey}}` : '';
        output += `${name}${labels} ${value}\n`;
      }
      output += '\n';
    }

    // Export histograms
    for (const [name, histogram] of this.histograms) {
      const stats = this.getHistogramStats(name);
      output += `# HELP ${name} ${histogram.description}\n`;
      output += `# TYPE ${name} histogram\n`;
      output += `${name}_count ${stats.count}\n`;
      output += `${name}_sum ${stats.sum}\n`;
      output += `${name}_avg ${stats.avg.toFixed(2)}\n`;
      output += `${name}_p50 ${stats.p50}\n`;
      output += `${name}_p95 ${stats.p95}\n`;
      output += `${name}_p99 ${stats.p99}\n\n`;
    }

    return output;
  }

  /**
   * Get metrics as JSON
   */
  getMetricsJSON(): Record<string, any> {
    const result: Record<string, any> = {};

    // Export counters
    for (const [name, counter] of this.counters) {
      result[name] = {
        type: 'counter',
        description: counter.description,
        value: counter.value,
        labels: counter.labels
      };
    }

    // Export histograms
    for (const [name, histogram] of this.histograms) {
      const stats = this.getHistogramStats(name);
      result[name] = {
        type: 'histogram',
        description: histogram.description,
        buckets: histogram.buckets,
        ...stats
      };
    }

    return result;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    for (const counter of this.counters.values()) {
      counter.value = 0;
      counter.labels = {};
    }
    
    for (const histogram of this.histograms.values()) {
      histogram.values = [];
      histogram.count = 0;
      histogram.sum = 0;
    }
  }

  /**
   * Helper method to time operations
   */
  async timeOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.recordHistogram(`${operation}_latency_ms_hist`, duration);
      this.incrementCounter(`${operation}_total`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.recordHistogram(`${operation}_latency_ms_hist`, duration);
      this.incrementCounter(`${operation}_failures_total`);
      throw error;
    }
  }
}

// Export singleton instance
export const metrics = new MetricsCollector();

// Export types
export type { Counter, Histogram, MetricValue };
