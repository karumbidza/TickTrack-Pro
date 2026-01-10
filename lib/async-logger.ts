import { v4 as uuidv4 } from 'uuid'

/**
 * ASYNCHRONOUS NON-BLOCKING LOGGER
 * ==================================
 * - Queues log entries in memory
 * - Flushes asynchronously in batches
 * - Never blocks API request execution
 * - Attaches request IDs for correlation
 * - Graceful shutdown with flush
 */

const ASYNC_LOGGING_ENABLED = process.env.ENABLE_ASYNC_LOGGING === 'true'
const LOG_QUEUE_SIZE = parseInt(process.env.LOG_QUEUE_SIZE || '1000')
const LOG_FLUSH_INTERVAL = parseInt(process.env.LOG_FLUSH_INTERVAL || '5000')

const isDev = process.env.NODE_ENV === 'development'
const isDebug = process.env.DEBUG === 'true'

interface LogEntry {
  timestamp: Date
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  requestId?: string
  message: string
  data?: any[]
}

class AsyncLogger {
  private queue: LogEntry[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private isFlushing = false

  constructor() {
    if (ASYNC_LOGGING_ENABLED) {
      this.startFlushTimer()
      this.setupShutdownHandlers()
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, LOG_FLUSH_INTERVAL)
  }

  private setupShutdownHandlers() {
    const shutdown = () => {
      this.flushSync()
      if (this.flushTimer) {
        clearInterval(this.flushTimer)
      }
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    process.on('beforeExit', shutdown)
  }

  private enqueue(entry: LogEntry) {
    // If queue is full, flush immediately (synchronously)
    if (this.queue.length >= LOG_QUEUE_SIZE) {
      this.flushSync()
    }

    this.queue.push(entry)
  }

  private async flush() {
    if (this.isFlushing || this.queue.length === 0) {
      return
    }

    this.isFlushing = true
    const entries = [...this.queue]
    this.queue = []

    try {
      // Process logs asynchronously without blocking
      setImmediate(() => {
        entries.forEach((entry) => {
          this.writeLog(entry)
        })
      })
    } catch (error) {
      // Silently fail - logging should never crash the app
      console.error('[LOGGER] Flush error:', error)
    } finally {
      this.isFlushing = false
    }
  }

  private flushSync() {
    if (this.queue.length === 0) return

    const entries = [...this.queue]
    this.queue = []

    entries.forEach((entry) => {
      this.writeLog(entry)
    })
  }

  private writeLog(entry: LogEntry) {
    const prefix = entry.requestId ? `[${entry.requestId}]` : ''
    const timestamp = entry.timestamp.toISOString()

    switch (entry.level) {
      case 'DEBUG':
        if (isDev || isDebug) {
          console.log(`[${timestamp}] [DEBUG] ${prefix}`, entry.message, ...entry.data || [])
        }
        break
      case 'INFO':
        if (isDev || isDebug) {
          console.log(`[${timestamp}] [INFO] ${prefix}`, entry.message, ...entry.data || [])
        }
        break
      case 'WARN':
        console.warn(`[${timestamp}] [WARN] ${prefix}`, entry.message, ...entry.data || [])
        break
      case 'ERROR':
        console.error(`[${timestamp}] [ERROR] ${prefix}`, entry.message, ...entry.data || [])
        break
    }
  }

  private log(level: LogEntry['level'], message: string, data?: any[], requestId?: string) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      requestId,
      message,
      data,
    }

    if (ASYNC_LOGGING_ENABLED) {
      this.enqueue(entry)
    } else {
      // Fallback to synchronous logging if disabled
      this.writeLog(entry)
    }
  }

  debug(message: string, ...data: any[]) {
    this.log('DEBUG', message, data)
  }

  info(message: string, ...data: any[]) {
    this.log('INFO', message, data)
  }

  warn(message: string, ...data: any[]) {
    this.log('WARN', message, data)
  }

  error(message: string, ...data: any[]) {
    this.log('ERROR', message, data)
  }

  // Request-scoped logging with correlation ID
  withRequest(requestId: string) {
    return {
      debug: (message: string, ...data: any[]) => this.log('DEBUG', message, data, requestId),
      info: (message: string, ...data: any[]) => this.log('INFO', message, data, requestId),
      warn: (message: string, ...data: any[]) => this.log('WARN', message, data, requestId),
      error: (message: string, ...data: any[]) => this.log('ERROR', message, data, requestId),
    }
  }
}

// Singleton instance
export const logger = new AsyncLogger()

// Generate unique request ID
export const generateRequestId = () => uuidv4().substring(0, 8)

// Export for backward compatibility
export default logger
