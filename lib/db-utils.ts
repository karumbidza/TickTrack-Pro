/**
 * DATABASE QUERY UTILITIES
 * =========================
 * Safe database operations with timeouts, retries, and error handling.
 */

import { prisma } from './prisma'
import { withTimeout, withRetry } from './resilience'

// Default query timeout (30 seconds)
const DEFAULT_QUERY_TIMEOUT_MS = 30000

// Critical query timeout (60 seconds) for complex operations
const CRITICAL_QUERY_TIMEOUT_MS = 60000

/**
 * Execute a database query with timeout protection
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  options: {
    timeoutMs?: number
    retries?: number
    name?: string
  } = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_QUERY_TIMEOUT_MS, retries = 0, name = 'query' } = options

  const executeWithTimeout = () =>
    withTimeout(queryFn(), timeoutMs, `Database query "${name}" timed out after ${timeoutMs}ms`)

  if (retries > 0) {
    return withRetry(executeWithTimeout, {
      maxRetries: retries,
      initialDelayMs: 500,
      retryOn: (error) => {
        // Retry on connection errors, not on constraint violations
        const message = error.message.toLowerCase()
        return (
          message.includes('connection') ||
          message.includes('timeout') ||
          message.includes('deadlock')
        )
      },
    })
  }

  return executeWithTimeout()
}

/**
 * Execute a transaction with timeout protection
 */
export async function safeTransaction<T>(
  transactionFn: (tx: typeof prisma) => Promise<T>,
  options: {
    timeoutMs?: number
    maxWait?: number
    name?: string
  } = {}
): Promise<T> {
  const { timeoutMs = CRITICAL_QUERY_TIMEOUT_MS, maxWait = 5000, name = 'transaction' } = options

  return withTimeout(
    prisma.$transaction(
      async (tx) => {
        // @ts-ignore - tx is a transaction client
        return transactionFn(tx)
      },
      {
        maxWait,
        timeout: timeoutMs,
      }
    ),
    timeoutMs + maxWait + 1000, // Give slight buffer above transaction timeout
    `Database transaction "${name}" timed out`
  )
}

/**
 * Batch operations with chunking to prevent memory issues
 */
export async function batchProcess<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  options: {
    batchSize?: number
    delayMs?: number
    continueOnError?: boolean
  } = {}
): Promise<{ results: R[]; errors: { item: T; error: Error }[] }> {
  const { batchSize = 10, delayMs = 100, continueOnError = true } = options
  const results: R[] = []
  const errors: { item: T; error: Error }[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    // Process batch in parallel
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await processFn(item)
        results.push(result)
      } catch (error) {
        if (continueOnError) {
          errors.push({ item, error: error as Error })
        } else {
          throw error
        }
      }
    })

    await Promise.all(batchPromises)

    // Delay between batches to prevent overwhelming the database
    if (i + batchSize < items.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return { results, errors }
}

/**
 * Safe count with timeout
 */
export async function safeCount(
  countFn: () => Promise<number>,
  fallback = 0,
  timeoutMs = 10000
): Promise<number> {
  try {
    return await withTimeout(countFn(), timeoutMs, 'Count query timed out')
  } catch (error) {
    console.error('[safeCount] Failed:', error)
    return fallback
  }
}

/**
 * Check database health with ping
 */
export async function pingDatabase(): Promise<{ healthy: boolean; latencyMs: number }> {
  const start = Date.now()
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000, 'Database ping timed out')
    return { healthy: true, latencyMs: Date.now() - start }
  } catch (error) {
    return { healthy: false, latencyMs: Date.now() - start }
  }
}
