/**
 * API ERROR HANDLING UTILITIES
 * =============================
 * Standardized error responses for API routes.
 * Prevents information disclosure while logging details server-side.
 */

import { NextResponse } from 'next/server'
import { logger } from './logger'
import { ZodError } from 'zod'

// Standard error response codes
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
} as const

type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

// User-safe error messages (no internal details)
const UserMessages: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Invalid request data',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  INTERNAL_ERROR: 'An error occurred. Please try again.',
  BAD_REQUEST: 'Invalid request',
}

// Status codes for each error type
const StatusCodes: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  BAD_REQUEST: 400,
}

/**
 * Create a standardized API error response
 */
export function apiError(
  code: ErrorCode,
  customMessage?: string,
  details?: unknown
) {
  // Log internal details for debugging (server-side only)
  if (details) {
    logger.error(`API Error [${code}]:`, { customMessage, details })
  }

  return NextResponse.json(
    {
      error: customMessage || UserMessages[code],
      code,
    },
    { status: StatusCodes[code] }
  )
}

/**
 * Handle Zod validation errors
 */
export function handleZodError(error: ZodError) {
  const messages = error.errors.map(e => {
    const path = e.path.join('.')
    return path ? `${path}: ${e.message}` : e.message
  })

  return NextResponse.json(
    {
      error: messages.join(', '),
      code: ErrorCodes.VALIDATION_ERROR,
    },
    { status: 400 }
  )
}

/**
 * Handle unknown errors safely
 */
export function handleError(error: unknown, context?: string) {
  // Log full error details server-side
  logger.error(`Unhandled error${context ? ` in ${context}` : ''}:`, error)

  // Return generic message to client
  return NextResponse.json(
    {
      error: 'An error occurred. Please try again.',
      code: ErrorCodes.INTERNAL_ERROR,
    },
    { status: 500 }
  )
}

/**
 * Wrap an API handler with error handling
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(error)
      }
      return handleError(error, context)
    }
  }) as T
}
