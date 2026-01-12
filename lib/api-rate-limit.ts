/**
 * API RATE LIMITING WRAPPER
 * =========================
 * Higher-order function to wrap API route handlers with rate limiting.
 * Use this to protect individual API routes.
 * 
 * Usage:
 *   import { withRateLimit } from '@/lib/api-rate-limit'
 *   export const GET = withRateLimit(handler, 'api')
 *   export const POST = withRateLimit(handler, 'auth')
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  checkRateLimit, 
  getRateLimitHeaders, 
  RATE_LIMITS, 
  RateLimitConfig 
} from './rate-limit'

type ApiHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse> | NextResponse

/**
 * Get client IP from request headers
 */
function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  // Fallback - this may not work in all environments
  return request.headers.get('x-client-ip') || 'unknown'
}

/**
 * Wrap an API handler with rate limiting
 */
export function withRateLimit(
  handler: ApiHandler,
  limitType: keyof typeof RATE_LIMITS = 'api'
): ApiHandler {
  const config = RATE_LIMITS[limitType]

  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    const ip = getClientIp(request)
    const pathname = new URL(request.url).pathname
    
    // Create unique identifier: type:ip:path
    const identifier = `${limitType}:${ip}:${pathname}`
    
    try {
      const result = await checkRateLimit(identifier, config)
      
      if (!result.success) {
        // Rate limit exceeded
        return NextResponse.json(
          {
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
            retryAfter: result.retryAfter,
          },
          {
            status: 429,
            headers: getRateLimitHeaders(result),
          }
        )
      }
      
      // Execute the handler
      const response = await handler(request, context)
      
      // Add rate limit headers to successful response
      const headers = getRateLimitHeaders(result)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      
      return response
    } catch (error) {
      // If rate limiting fails, allow the request (fail open)
      console.error('[RateLimit] Error checking rate limit:', error)
      return handler(request, context)
    }
  }
}

/**
 * Create a custom rate limited handler with specific config
 */
export function withCustomRateLimit(
  handler: ApiHandler,
  config: RateLimitConfig
): ApiHandler {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    const ip = getClientIp(request)
    const pathname = new URL(request.url).pathname
    const identifier = `custom:${ip}:${pathname}`
    
    try {
      const result = await checkRateLimit(identifier, config)
      
      if (!result.success) {
        return NextResponse.json(
          {
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
            retryAfter: result.retryAfter,
          },
          {
            status: 429,
            headers: getRateLimitHeaders(result),
          }
        )
      }
      
      const response = await handler(request, context)
      
      const headers = getRateLimitHeaders(result)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      
      return response
    } catch (error) {
      console.error('[RateLimit] Error checking rate limit:', error)
      return handler(request, context)
    }
  }
}

/**
 * Standalone rate limit check for use in existing handlers
 * Returns null if allowed, or a 429 response if rate limited
 */
export async function rateLimitCheck(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = 'api'
): Promise<NextResponse | null> {
  const ip = getClientIp(request)
  const pathname = new URL(request.url).pathname
  const identifier = `${limitType}:${ip}:${pathname}`
  const config = RATE_LIMITS[limitType]

  try {
    const result = await checkRateLimit(identifier, config)
    
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(result),
        }
      )
    }
    
    return null // Allowed
  } catch (error) {
    console.error('[RateLimit] Error:', error)
    return null // Fail open
  }
}
