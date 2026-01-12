/**
 * RATE LIMITING UTILITY
 * =====================
 * Protects API endpoints from abuse with Redis-backed rate limiting.
 * Falls back to in-memory storage when Redis is unavailable.
 * 
 * Features:
 * - Sliding window rate limiting
 * - Redis-backed for distributed environments (PM2 cluster)
 * - Graceful fallback to in-memory
 * - Different limits for different endpoint types
 */

import { getRedisClient, isRedisAvailable } from './redis'

// In-memory fallback for when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of memoryStore.entries()) {
      if (now > value.resetTime) {
        memoryStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitConfig {
  limit: number        // Max requests allowed
  windowMs: number     // Time window in milliseconds
}

export interface RateLimitResult {
  success: boolean     // Whether request is allowed
  limit: number        // Max requests allowed
  remaining: number    // Remaining requests in window
  reset: number        // Unix timestamp when window resets
  retryAfter?: number  // Seconds until next request allowed (if blocked)
}

// Preset configurations for different endpoint types
export const RATE_LIMITS = {
  // General API endpoints - generous limits
  api: { limit: 100, windowMs: 60 * 1000 },           // 100 req/min
  
  // Authentication - stricter to prevent brute force
  auth: { limit: 10, windowMs: 60 * 1000 },           // 10 req/min
  
  // Heavy operations (reports, exports)
  heavy: { limit: 10, windowMs: 60 * 1000 },          // 10 req/min
  
  // File uploads - moderate limits
  upload: { limit: 20, windowMs: 60 * 1000 },         // 20 req/min
  
  // Admin operations
  admin: { limit: 50, windowMs: 60 * 1000 },          // 50 req/min
  
  // Super admin - higher limits
  superAdmin: { limit: 200, windowMs: 60 * 1000 },    // 200 req/min
  
  // WebSocket/SSE polling - very high limits
  realtime: { limit: 300, windowMs: 60 * 1000 },      // 300 req/min
} as const

/**
 * Check rate limit for a given identifier
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.api
): Promise<RateLimitResult> {
  const { limit, windowMs } = config
  const now = Date.now()
  const windowStart = now - windowMs
  const key = `ratelimit:${identifier}`

  try {
    // Try Redis first if available
    const redis = getRedisClient()
    if (isRedisAvailable() && redis) {
      return await checkRateLimitRedis(redis, key, limit, windowMs, now, windowStart)
    }
  } catch (error) {
    console.warn('[RateLimit] Redis error, falling back to memory:', error)
  }

  // Fallback to in-memory
  return checkRateLimitMemory(key, limit, windowMs, now)
}

/**
 * Redis-backed rate limiting using sorted sets (sliding window)
 */
async function checkRateLimitRedis(
  redis: any,
  key: string,
  limit: number,
  windowMs: number,
  now: number,
  windowStart: number
): Promise<RateLimitResult> {
  if (!redis) {
    throw new Error('Redis not available')
  }

  // Use Redis sorted set for sliding window
  const multi = redis.multi()
  
  // Remove old entries outside the window
  multi.zremrangebyscore(key, 0, windowStart)
  
  // Count current requests in window
  multi.zcard(key)
  
  // Add current request
  multi.zadd(key, now, `${now}-${Math.random()}`)
  
  // Set expiry on the key
  multi.expire(key, Math.ceil(windowMs / 1000))
  
  const results = await multi.exec()
  
  // Get count from zcard result (index 1)
  const count = (results?.[1]?.[1] as number) || 0
  const resetTime = now + windowMs

  if (count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil(resetTime / 1000),
      retryAfter: Math.ceil(windowMs / 1000),
    }
  }

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - count - 1),
    reset: Math.ceil(resetTime / 1000),
  }
}

/**
 * In-memory rate limiting (fallback)
 */
function checkRateLimitMemory(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): RateLimitResult {
  const record = memoryStore.get(key)
  const resetTime = now + windowMs

  // New window or expired window
  if (!record || now > record.resetTime) {
    memoryStore.set(key, { count: 1, resetTime })
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(resetTime / 1000),
    }
  }

  // Within existing window
  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil(record.resetTime / 1000),
      retryAfter,
    }
  }

  // Increment counter
  record.count++
  
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: Math.ceil(record.resetTime / 1000),
  }
}

/**
 * Get rate limit type based on URL path
 */
export function getRateLimitType(pathname: string): keyof typeof RATE_LIMITS {
  // Auth endpoints - strict limits
  if (pathname.includes('/api/auth') || pathname.includes('/signin') || pathname.includes('/login')) {
    return 'auth'
  }
  
  // Super admin - higher limits
  if (pathname.includes('/api/super-admin')) {
    return 'superAdmin'
  }
  
  // Admin endpoints
  if (pathname.includes('/api/admin')) {
    return 'admin'
  }
  
  // File uploads
  if (pathname.includes('/api/upload')) {
    return 'upload'
  }
  
  // Heavy operations
  if (pathname.includes('/reports') || pathname.includes('/export') || pathname.includes('/stats')) {
    return 'heavy'
  }
  
  // Real-time polling (messages, notifications)
  if (pathname.includes('/messages') || pathname.includes('/notifications')) {
    return 'realtime'
  }
  
  // Default API rate limit
  return 'api'
}

/**
 * Generate rate limit identifier from request
 * Uses IP + tenant for multi-tenant isolation
 */
export function getRateLimitIdentifier(
  ip: string,
  pathname: string,
  tenantId?: string
): string {
  const type = getRateLimitType(pathname)
  
  // Include tenant ID if available for per-tenant limits
  if (tenantId) {
    return `${type}:${tenantId}:${ip}`
  }
  
  return `${type}:${ip}`
}

/**
 * Format rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  }

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }

  return headers
}
