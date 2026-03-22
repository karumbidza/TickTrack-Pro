/**
 * REQUEST TIMEOUT & RESILIENCE UTILITIES
 * =======================================
 * Prevents hanging requests, implements retry logic, and graceful degradation.
 */

/**
 * Wraps a promise with a timeout
 * If the promise doesn't resolve within the timeout, it rejects
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(timeoutId!)
    return result
  } catch (error) {
    clearTimeout(timeoutId!)
    throw error
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelayMs?: number
    maxDelayMs?: number
    backoffMultiplier?: number
    retryOn?: (error: Error) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    retryOn = () => true,
  } = options

  let lastError: Error
  let delay = initialDelayMs

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Check if we should retry this error
      if (!retryOn(lastError) || attempt === maxRetries) {
        throw lastError
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * backoffMultiplier, maxDelayMs)
    }
  }

  throw lastError!
}

/**
 * Circuit breaker implementation
 * Prevents cascading failures by stopping requests to failing services
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private readonly options: {
      failureThreshold?: number
      resetTimeoutMs?: number
      name?: string
    } = {}
  ) {}

  private get failureThreshold() {
    return this.options.failureThreshold ?? 5
  }

  private get resetTimeoutMs() {
    return this.options.resetTimeoutMs ?? 60000 // 1 minute
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be half-open
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime
      if (timeSinceLastFailure >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error(
          `Circuit breaker is OPEN for ${this.options.name || 'service'}. Try again later.`
        )
      }
    }

    try {
      const result = await fn()

      // Success - reset circuit
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED'
        this.failures = 0
      }

      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()

      // Check if we should open the circuit
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN'
        console.error(
          `[CircuitBreaker] Circuit OPENED for ${this.options.name || 'service'} after ${this.failures} failures`
        )
      }

      throw error
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    }
  }

  reset() {
    this.state = 'CLOSED'
    this.failures = 0
    this.lastFailureTime = 0
  }
}

// Pre-configured circuit breakers for external services
export const emailCircuitBreaker = new CircuitBreaker({ name: 'email', failureThreshold: 3 })
export const smsCircuitBreaker = new CircuitBreaker({ name: 'sms', failureThreshold: 3 })
export const storageCircuitBreaker = new CircuitBreaker({ name: 'r2-storage', failureThreshold: 5 })

/**
 * Graceful degradation - return fallback on failure
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  options: { logError?: boolean } = {}
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (options.logError !== false) {
      console.error('[Fallback] Operation failed, using fallback:', error)
    }
    return fallback
  }
}

/**
 * Rate limiter for client-side operations
 */
export function createRateLimiter(options: {
  maxRequests: number
  windowMs: number
}) {
  const requests: number[] = []

  return {
    canProceed(): boolean {
      const now = Date.now()
      // Remove old requests outside the window
      while (requests.length > 0 && requests[0] < now - options.windowMs) {
        requests.shift()
      }
      return requests.length < options.maxRequests
    },

    recordRequest(): void {
      requests.push(Date.now())
    },

    async waitAndProceed(): Promise<void> {
      while (!this.canProceed()) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      this.recordRequest()
    },
  }
}
