import { PrismaClient } from '@prisma/client'
import { logger } from './async-logger'

declare global {
  var prisma: PrismaClient | undefined
}

/**
 * DATABASE CONNECTION POOLING CONFIGURATION
 * ==========================================
 * - Configurable pool size via environment variables
 * - Connection reuse across requests
 * - Automatic connection management
 * - Graceful shutdown handling
 */

const DB_POOLING_ENABLED = process.env.ENABLE_DB_POOLING === 'true'

// Connection pool configuration
const poolConfig = DB_POOLING_ENABLED
  ? {
      connection_limit: parseInt(process.env.DB_POOL_MAX || '10'),
      pool_timeout: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '30'),
    }
  : undefined

// Build DATABASE_URL with pool parameters if enabled
function getDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || ''

  if (!DB_POOLING_ENABLED || !poolConfig) {
    return baseUrl
  }

  const url = new URL(baseUrl)
  url.searchParams.set('connection_limit', poolConfig.connection_limit.toString())
  url.searchParams.set('pool_timeout', poolConfig.pool_timeout.toString())

  return url.toString()
}

// Create Prisma Client with optimized configuration
export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

// Log pool configuration on startup
if (DB_POOLING_ENABLED) {
  logger.info(
    `Database pooling enabled: max=${poolConfig?.connection_limit}, timeout=${poolConfig?.pool_timeout}s`
  )
}

// Graceful shutdown
const shutdown = async () => {
  await prisma.$disconnect()
  logger.info('Database connections closed')
}

if (typeof process !== 'undefined') {
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}