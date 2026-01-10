/**
 * PERFORMANCE METRICS TRACKING
 * =============================
 * - Lightweight in-memory metrics
 * - Cache hit/miss ratios
 * - Response times
 * - Database pool stats
 * - Minimal overhead
 */

interface Metrics {
  cacheHits: number
  cacheMisses: number
  totalRequests: number
  totalResponseTime: number
  slowQueries: number
}

class MetricsCollector {
  private metrics: Metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
    totalResponseTime: 0,
    slowQueries: 0,
  }

  private requestTimes: number[] = []
  private maxSamples = 1000 // Keep last 1000 request times

  recordCacheHit() {
    this.metrics.cacheHits++
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++
  }

  recordRequest(responseTimeMs: number) {
    this.metrics.totalRequests++
    this.metrics.totalResponseTime += responseTimeMs

    // Track response times for percentile calculations
    this.requestTimes.push(responseTimeMs)
    if (this.requestTimes.length > this.maxSamples) {
      this.requestTimes.shift()
    }

    // Track slow queries (>1s)
    if (responseTimeMs > 1000) {
      this.metrics.slowQueries++
    }
  }

  getCacheHitRatio(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses
    return total > 0 ? this.metrics.cacheHits / total : 0
  }

  getAverageResponseTime(): number {
    return this.metrics.totalRequests > 0
      ? this.metrics.totalResponseTime / this.metrics.totalRequests
      : 0
  }

  getPercentile(percentile: number): number {
    if (this.requestTimes.length === 0) return 0

    const sorted = [...this.requestTimes].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[index] || 0
  }

  getMetrics() {
    return {
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRatio: this.getCacheHitRatio(),
      },
      requests: {
        total: this.metrics.totalRequests,
        avgResponseTime: this.getAverageResponseTime(),
        p50: this.getPercentile(50),
        p95: this.getPercentile(95),
        p99: this.getPercentile(99),
        slowQueries: this.metrics.slowQueries,
      },
    }
  }

  reset() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      totalResponseTime: 0,
      slowQueries: 0,
    }
    this.requestTimes = []
  }
}

export const metrics = new MetricsCollector()
