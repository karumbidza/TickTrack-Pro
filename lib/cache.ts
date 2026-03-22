/**
 * IN-MEMORY CACHING LAYER
 * ========================
 * Reduces database load and improves response times.
 * Uses LRU (Least Recently Used) eviction strategy.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
  lastAccessed: number
}

interface CacheOptions {
  maxSize?: number
  defaultTtlMs?: number
}

export class InMemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private readonly maxSize: number
  private readonly defaultTtlMs: number

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000
    this.defaultTtlMs = options.defaultTtlMs ?? 5 * 60 * 1000 // 5 minutes default
    
    // Run cleanup every minute
    setInterval(() => this.cleanup(), 60 * 1000)
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    // Update last accessed time
    entry.lastAccessed = Date.now()
    return entry.value
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      lastAccessed: Date.now(),
    })
  }

  /**
   * Get or set - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await fetcher()
    this.set(key, value, ttlMs)
    return value
  }

  /**
   * Invalidate a specific key
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Invalidate all keys matching a pattern
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern)
    let count = 0

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let expired = 0
    const now = Date.now()

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      utilization: ((this.cache.size / this.maxSize) * 100).toFixed(1) + '%',
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestAccess = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`)
    }
  }
}

// ============================================
// PRE-CONFIGURED CACHE INSTANCES
// ============================================

// Short TTL for frequently changing data (1 minute)
export const shortCache = new InMemoryCache({
  maxSize: 500,
  defaultTtlMs: 60 * 1000, // 1 minute
})

// Medium TTL for semi-static data (5 minutes)
export const mediumCache = new InMemoryCache({
  maxSize: 1000,
  defaultTtlMs: 5 * 60 * 1000, // 5 minutes
})

// Long TTL for static data (30 minutes)
export const longCache = new InMemoryCache({
  maxSize: 500,
  defaultTtlMs: 30 * 60 * 1000, // 30 minutes
})

// ============================================
// CACHE KEY GENERATORS
// ============================================

export const CacheKeys = {
  // User-related
  user: (id: string) => `user:${id}`,
  userPermissions: (id: string) => `user:${id}:permissions`,
  userFeatures: (tenantId: string) => `tenant:${tenantId}:features`,

  // Tenant-related
  tenant: (id: string) => `tenant:${id}`,
  tenantStats: (id: string) => `tenant:${id}:stats`,
  tenantSubscription: (id: string) => `tenant:${id}:subscription`,

  // Ticket-related
  ticket: (id: string) => `ticket:${id}`,
  ticketList: (tenantId: string, page: number) => `tenant:${tenantId}:tickets:page:${page}`,

  // Asset-related
  assetCategories: (tenantId: string) => `tenant:${tenantId}:asset-categories`,
  assets: (tenantId: string, page: number) => `tenant:${tenantId}:assets:page:${page}`,

  // Branch/Location
  branches: (tenantId: string) => `tenant:${tenantId}:branches`,
  locations: (tenantId: string) => `tenant:${tenantId}:locations`,

  // Contractor-related
  contractor: (id: string) => `contractor:${id}`,
  contractorList: (tenantId: string) => `tenant:${tenantId}:contractors`,

  // Feature flags
  featureFlags: (tenantId: string) => `tenant:${tenantId}:feature-flags`,
}

// ============================================
// CACHE INVALIDATION HELPERS
// ============================================

export function invalidateUserCache(userId: string): void {
  shortCache.invalidate(CacheKeys.user(userId))
  shortCache.invalidate(CacheKeys.userPermissions(userId))
}

export function invalidateTenantCache(tenantId: string): void {
  shortCache.invalidatePattern(`tenant:${tenantId}:.*`)
  mediumCache.invalidatePattern(`tenant:${tenantId}:.*`)
  longCache.invalidatePattern(`tenant:${tenantId}:.*`)
}

export function invalidateTicketCache(ticketId: string, tenantId: string): void {
  shortCache.invalidate(CacheKeys.ticket(ticketId))
  shortCache.invalidatePattern(`tenant:${tenantId}:tickets:.*`)
}

// ============================================
// GLOBAL CACHE STATS
// ============================================

export function getAllCacheStats() {
  return {
    short: shortCache.getStats(),
    medium: mediumCache.getStats(),
    long: longCache.getStats(),
    timestamp: new Date().toISOString(),
  }
}
