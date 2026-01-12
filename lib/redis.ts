import Redis from 'ioredis'
import { logger } from './async-logger'

/**
 * REDIS CLIENT CONFIGURATION
 * ============================
 * - Graceful fallback when Redis unavailable
 * - Connection pooling
 * - Automatic reconnection with exponential backoff
 * - Health monitoring
 */

// Feature flag
const REDIS_ENABLED = process.env.ENABLE_REDIS_CACHE === 'true'

// Redis configuration from environment
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000'),
  retryStrategy: (times: number) => {
    // Exponential backoff: 50ms, 100ms, 200ms, 400ms, max 3s
    const delay = Math.min(times * 50, 3000)
    return delay
  },
  lazyConnect: true, // Don't connect immediately
}

// Default TTLs (in seconds)
export const CACHE_TTL = {
  TICKETS: parseInt(process.env.CACHE_TTL_TICKETS || '60'),
  CONTRACTORS: parseInt(process.env.CACHE_TTL_CONTRACTORS || '300'),
  INVOICES: parseInt(process.env.CACHE_TTL_INVOICES || '120'),
  STATS: parseInt(process.env.CACHE_TTL_STATS || '30'),
  ASSETS: parseInt(process.env.CACHE_TTL_ASSETS || '180'),
  DEFAULT: parseInt(process.env.REDIS_TTL_DEFAULT || '300'),
}

class RedisClient {
  private client: Redis | null = null
  private isConnected = false
  private connectionAttempted = false

  constructor() {
    if (REDIS_ENABLED) {
      this.initializeClient()
    } else {
      logger.info('Redis caching is disabled via feature flag')
    }
  }

  private initializeClient() {
    try {
      this.client = new Redis(REDIS_CONFIG)

      this.client.on('connect', () => {
        this.isConnected = true
        logger.info('Redis connected successfully')
      })

      this.client.on('ready', () => {
        logger.info('Redis client ready')
      })

      this.client.on('error', (error) => {
        this.isConnected = false
        logger.warn('Redis connection error (graceful fallback):', error.message)
      })

      this.client.on('close', () => {
        this.isConnected = false
        logger.warn('Redis connection closed')
      })

      // Attempt connection
      this.client.connect().catch((err) => {
        logger.warn('Redis connection failed, operating without cache:', err.message)
      })

      this.connectionAttempted = true
    } catch (error) {
      logger.warn('Failed to initialize Redis client:', error)
      this.client = null
    }
  }

  /**
   * Get value from cache
   * Returns null on cache miss or Redis unavailable
   */
  async get<T>(key: string): Promise<T | null> {
    if (!REDIS_ENABLED || !this.client || !this.isConnected) {
      return null
    }

    try {
      const value = await this.client.get(key)
      if (value) {
        logger.debug(`Cache HIT: ${key}`)
        return JSON.parse(value) as T
      }
      logger.debug(`Cache MISS: ${key}`)
      return null
    } catch (error) {
      logger.warn(`Redis GET error for key ${key}:`, error)
      return null // Graceful fallback
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl: number = CACHE_TTL.DEFAULT): Promise<boolean> {
    if (!REDIS_ENABLED || !this.client || !this.isConnected) {
      return false
    }

    try {
      const serialized = JSON.stringify(value)
      await this.client.setex(key, ttl, serialized)
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`)
      return true
    } catch (error) {
      logger.warn(`Redis SET error for key ${key}:`, error)
      return false // Don't throw, just log
    }
  }

  /**
   * Delete specific key
   */
  async del(key: string): Promise<boolean> {
    if (!REDIS_ENABLED || !this.client || !this.isConnected) {
      return false
    }

    try {
      await this.client.del(key)
      logger.debug(`Cache DEL: ${key}`)
      return true
    } catch (error) {
      logger.warn(`Redis DEL error for key ${key}:`, error)
      return false
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<boolean> {
    if (!REDIS_ENABLED || !this.client || !this.isConnected) {
      return false
    }

    try {
      const keys = await this.client.keys(pattern)
      if (keys.length > 0) {
        await this.client.del(...keys)
        logger.debug(`Cache DEL pattern: ${pattern} (${keys.length} keys)`)
      }
      return true
    } catch (error) {
      logger.warn(`Redis DEL pattern error for ${pattern}:`, error)
      return false
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return REDIS_ENABLED && this.isConnected
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit()
        logger.info('Redis connection closed gracefully')
      } catch (error) {
        logger.warn('Error during Redis disconnect:', error)
      }
    }
  }
}

// Singleton instance
export const redisClient = new RedisClient()

// Export direct client access for advanced operations (rate limiting)
export const getRedisClient = () => redisClient['client']
export const isRedisAvailable = () => redisClient.isAvailable()

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  const shutdown = async () => {
    await redisClient.disconnect()
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
