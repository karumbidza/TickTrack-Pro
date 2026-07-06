import { NextRequest, NextResponse } from 'next/server'
import { BillingService } from '@/lib/billing-service'
import { logger } from '@/lib/logger'
import { timingSafeEqual } from 'crypto'

/**
 * Constant-time comparison of the presented cron secret against CRON_SECRET.
 * Prefer the Authorization header (`Bearer <secret>`); the ?secret= query param
 * is accepted as a deprecated fallback (it leaks into proxy/CDN access logs).
 */
function isValidCronSecret(request: NextRequest, expected: string): boolean {
  const authHeader = request.headers.get('authorization') || ''
  const headerSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const querySecret = new URL(request.url).searchParams.get('secret') || ''
  const provided = headerSecret || querySecret
  if (!provided) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * SUBSCRIPTION CHECK CRON ENDPOINT
 * =================================
 * Called by external cron service to check subscription states.
 * 
 * GET /api/cron/subscription-check?secret=XXX
 * 
 * CRON SETUP (cron-job.org or similar):
 * - Schedule: Every day at 2:00 AM UTC
 * - URL: https://yourdomain.com/api/cron/subscription-check?secret=YOUR_CRON_SECRET
 * - Method: GET
 * 
 * ENVIRONMENT VARIABLES:
 * - CRON_SECRET: Secret key to authenticate cron requests
 * 
 * STATE TRANSITIONS PERFORMED:
 * - ACTIVE/TRIAL → GRACE (when period ends)
 * - GRACE → READ_ONLY (after 7-day grace period)
 * 
 * NOTIFICATIONS SENT:
 * - Trial ending (3 days before)
 * - Subscription expired (entering grace)
 * - Grace period ending (2 days before)
 * - Account locked (read-only mode)
 */

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  logger.info(`[Cron:${requestId}] Subscription check started`)
  
  try {
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.error(`[Cron:${requestId}] CRON_SECRET not configured`)
      return NextResponse.json(
        { message: 'Cron secret not configured' },
        { status: 500 }
      )
    }

    if (!isValidCronSecret(request, cronSecret)) {
      logger.warn(`[Cron:${requestId}] Invalid cron secret provided`)
      return NextResponse.json(
        { message: 'Invalid secret' },
        { status: 401 }
      )
    }

    // Run the daily subscription check
    const result = await BillingService.runDailySubscriptionCheck()

    logger.info(`[Cron:${requestId}] Subscription check completed`, result)

    return NextResponse.json({
      message: 'Subscription check completed',
      requestId,
      timestamp: new Date().toISOString(),
      results: result
    })

  } catch (error) {
    logger.error(`[Cron:${requestId}] Subscription check failed:`, error)
    return NextResponse.json(
      { 
        message: 'Subscription check failed',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/subscription-check
 * Alternative for cron services that prefer POST
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
