import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redisClient, isRedisAvailable } from '@/lib/redis'

/**
 * HEALTH CHECK ENDPOINT
 * =====================
 * Returns the health status of the application and its dependencies.
 * Use this for monitoring, load balancer health checks, and debugging.
 * 
 * GET /api/health
 * GET /api/health?detailed=true  (includes more info)
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  checks: {
    database: { status: string; latency?: number; error?: string }
    redis: { status: string; latency?: number; error?: string }
    memory: { used: number; total: number; percentage: number }
  }
}

export async function GET(request: Request) {
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const detailed = searchParams.get('detailed') === 'true'

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
      memory: { used: 0, total: 0, percentage: 0 }
    }
  }

  // Check database
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    health.checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart
    }
  } catch (error) {
    health.status = 'unhealthy'
    health.checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Check Redis
  try {
    if (isRedisAvailable()) {
      const redisStart = Date.now()
      // Use a simple get to test Redis (redisClient handles the ping internally)
      await redisClient.get('health-check')
      health.checks.redis = {
        status: 'healthy',
        latency: Date.now() - redisStart
      }
    } else {
      health.checks.redis = {
        status: 'disabled',
        error: 'Redis caching is disabled'
      }
    }
  } catch (error) {
    // Redis failure is degraded, not unhealthy (app can work without it)
    if (health.status !== 'unhealthy') {
      health.status = 'degraded'
    }
    health.checks.redis = {
      status: 'degraded',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Check memory
  if (detailed && typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage()
    health.checks.memory = {
      used: Math.round(mem.heapUsed / 1024 / 1024),
      total: Math.round(mem.heapTotal / 1024 / 1024),
      percentage: Math.round((mem.heapUsed / mem.heapTotal) * 100)
    }
  }

  // Return appropriate status code
  const statusCode = health.status === 'unhealthy' ? 503 : 200

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`
    }
  })
}
