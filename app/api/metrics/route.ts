import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { metrics } from '@/lib/metrics'
import { redisClient } from '@/lib/redis'

/**
 * PERFORMANCE METRICS ENDPOINT
 * =============================
 * View real-time performance metrics
 * Only accessible by SUPER_ADMIN
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const performanceMetrics = metrics.getMetrics()

    const response = {
      timestamp: new Date().toISOString(),
      redis: {
        enabled: redisClient.isAvailable(),
      },
      ...performanceMetrics,
      environment: {
        pagination: process.env.ENABLE_PAGINATION === 'true',
        asyncLogging: process.env.ENABLE_ASYNC_LOGGING === 'true',
        redisCache: process.env.ENABLE_REDIS_CACHE === 'true',
        compression: process.env.ENABLE_COMPRESSION === 'true',
        dbPooling: process.env.ENABLE_DB_POOLING === 'true',
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST - Reset metrics
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    metrics.reset()

    return NextResponse.json({ message: 'Metrics reset successfully' })
  } catch (error) {
    console.error('Failed to reset metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
