import { redisClient, CACHE_TTL } from './redis'
import { logger } from './async-logger'
import { NextRequest, NextResponse } from 'next/server'

/**
 * REDIS CACHE MIDDLEWARE (CACHE-ASIDE PATTERN)
 * =============================================
 * - Deterministic cache key generation
 * - Automatic cache invalidation
 * - Graceful fallback when Redis unavailable
 * - Preserves exact API contract
 */

interface CacheOptions {
  ttl?: number
  keyPrefix?: string
  includeAuth?: boolean
  varyBy?: string[] // Additional parameters to include in cache key
}

/**
 * Generate deterministic cache key from request
 */
export function generateCacheKey(
  request: NextRequest,
  options: CacheOptions = {}
): string {
  const { pathname, searchParams } = new URL(request.url)
  const { keyPrefix = 'api', includeAuth = true, varyBy = [] } = options

  // Build key components
  const components: string[] = [keyPrefix, pathname.replace(/\//g, ':')]

  // Include query parameters (sorted for determinism)
  const params = new URLSearchParams(searchParams)
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  if (sortedParams) {
    components.push(sortedParams)
  }

  // Include auth scope if needed
  if (includeAuth) {
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      // Hash auth header to avoid storing sensitive data in key
      const authHash = simpleHash(authHeader)
      components.push(`auth:${authHash}`)
    }
  }

  // Include custom vary-by parameters
  varyBy.forEach((header) => {
    const value = request.headers.get(header)
    if (value) {
      components.push(`${header}:${simpleHash(value)}`)
    }
  })

  return components.join('::')
}

/**
 * Simple hash function for generating short keys
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Cache GET responses with automatic fallback
 */
export async function withCache<T = any>(
  request: NextRequest,
  handler: () => Promise<NextResponse<T>>,
  options: CacheOptions = {}
): Promise<NextResponse<T>> {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return handler()
  }

  // Check if Redis is available
  if (!redisClient.isAvailable()) {
    return handler()
  }

  const cacheKey = generateCacheKey(request, options)
  const ttl = options.ttl || CACHE_TTL.DEFAULT

  try {
    // Try to get from cache
    const cached = await redisClient.get<any>(cacheKey)

    if (cached) {
      // Cache hit - return cached response
      logger.debug(`Cache HIT: ${cacheKey}`)
      
      // Reconstruct NextResponse from cached data
      return new NextResponse(JSON.stringify(cached.body), {
        status: cached.status || 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          ...cached.headers,
        },
      }) as NextResponse<T>
    }

    // Cache miss - execute handler
    logger.debug(`Cache MISS: ${cacheKey}`)
    const response = await handler()

    // Only cache successful responses
    if (response.status === 200) {
      try {
        // Clone response to read body
        const clonedResponse = response.clone()
        const body = await clonedResponse.json()

        // Store in cache
        await redisClient.set(
          cacheKey,
          {
            body,
            status: response.status,
            headers: {
              'content-type': response.headers.get('content-type') || 'application/json',
            },
          },
          ttl
        )
      } catch (error) {
        // If caching fails, log but don't fail the request
        logger.warn('Failed to cache response:', error)
      }
    }

    // Add cache header to response
    response.headers.set('X-Cache', 'MISS')
    return response
  } catch (error) {
    // On any error, fallback to handler
    logger.warn('Cache middleware error, falling back to handler:', error)
    return handler()
  }
}

/**
 * Invalidate cache keys matching pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    await redisClient.delPattern(pattern)
    logger.debug(`Cache invalidated: ${pattern}`)
  } catch (error) {
    logger.warn('Cache invalidation error:', error)
  }
}

/**
 * Cache invalidation helpers for common patterns
 */
export const CacheInvalidation = {
  // Invalidate all tickets cache
  tickets: async (tenantId?: string) => {
    const pattern = tenantId
      ? `api::/api/admin/tickets*tenantId=${tenantId}*`
      : 'api::/api/admin/tickets*'
    await invalidateCache(pattern)
  },

  // Invalidate specific ticket
  ticket: async (ticketId: string) => {
    await invalidateCache(`api::/api/admin/tickets/${ticketId}*`)
    await invalidateCache(`api::/api/tickets/${ticketId}*`)
  },

  // Invalidate contractor caches
  contractors: async (tenantId?: string) => {
    const pattern = tenantId
      ? `api::/api/admin/contractors*tenantId=${tenantId}*`
      : 'api::/api/admin/contractors*'
    await invalidateCache(pattern)
  },

  // Invalidate invoices
  invoices: async (tenantId?: string) => {
    const pattern = tenantId
      ? `api::/api/admin/invoices*tenantId=${tenantId}*`
      : 'api::/api/admin/invoices*'
    await invalidateCache(pattern)
  },

  // Invalidate stats
  stats: async (tenantId?: string) => {
    await invalidateCache('api::/api/admin/stats*')
    if (tenantId) {
      await invalidateCache(`api::/api/admin/stats*tenantId=${tenantId}*`)
    }
  },

  // Invalidate all caches for a tenant
  tenant: async (tenantId: string) => {
    await invalidateCache(`*tenantId=${tenantId}*`)
  },
}
