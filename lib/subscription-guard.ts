/**
 * SUBSCRIPTION ACCESS GUARD
 * ==========================
 * Centralized access control based on subscription status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, type AuthContext } from '@/lib/auth'
import { prisma } from './prisma'

export type SubscriptionAccessLevel = 'full' | 'grace' | 'read_only' | 'blocked'

export interface SubscriptionAccessResult {
  allowed: boolean
  level: SubscriptionAccessLevel
  message?: string
  subscription?: {
    status: string
    plan: string
    currentPeriodEnd: Date | null
    gracePeriodEnd: Date | null
    daysRemaining: number
  }
}

export async function checkSubscriptionAccess(
  tenantId: string,
  requiredLevel: 'read' | 'write' = 'write'
): Promise<SubscriptionAccessResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId }
  })

  if (!subscription) {
    return { allowed: false, level: 'blocked', message: 'No active subscription found. Please subscribe to continue.' }
  }

  const status = subscription.status
  const now = new Date()
  const daysRemaining = subscription.currentPeriodEnd
    ? Math.max(0, Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : 0

  const subscriptionInfo = {
    status: subscription.status,
    plan: subscription.plan,
    currentPeriodEnd: subscription.currentPeriodEnd,
    gracePeriodEnd: subscription.gracePeriodEnd,
    daysRemaining
  }

  if (status === 'SUSPENDED') {
    return { allowed: false, level: 'blocked', message: 'Your account has been suspended. Please contact support.', subscription: subscriptionInfo }
  }

  if (status === 'READ_ONLY' || status === 'EXPIRED') {
    if (requiredLevel === 'write') {
      return { allowed: false, level: 'read_only', message: 'Your subscription has expired. You can view data but cannot make changes.', subscription: subscriptionInfo }
    }
    return { allowed: true, level: 'read_only', message: 'Your subscription has expired. Please renew to unlock full access.', subscription: subscriptionInfo }
  }

  if (status === 'GRACE' || status === 'PAST_DUE') {
    const graceDaysRemaining = subscription.gracePeriodEnd
      ? Math.max(0, Math.ceil((subscription.gracePeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      : 0
    return { allowed: true, level: 'grace', message: `Payment overdue. You have ${graceDaysRemaining} days remaining before access is restricted.`, subscription: subscriptionInfo }
  }

  if (status === 'ACTIVE' || status === 'TRIAL') {
    const message = status === 'TRIAL' && daysRemaining <= 3
      ? `Your trial ends in ${daysRemaining} days. Subscribe now to keep access.`
      : undefined
    return { allowed: true, level: 'full', message, subscription: subscriptionInfo }
  }

  return { allowed: requiredLevel === 'read', level: 'read_only', message: 'Your subscription is inactive. Please renew to continue.', subscription: subscriptionInfo }
}

type ApiHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse> | NextResponse

export function withSubscriptionGuard(
  handler: ApiHandler,
  options: { requiredLevel?: 'read' | 'write'; skipForRoles?: string[] } = {}
): ApiHandler {
  const { requiredLevel = 'write', skipForRoles = ['SUPER_ADMIN'] } = options

  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    try {
      const ctx = await getAuthContext()
      if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const { role, tenantId } = ctx

      if (skipForRoles.includes(role)) return handler(request, context)

      if (!tenantId) return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 })

      const access = await checkSubscriptionAccess(tenantId, requiredLevel)
      if (!access.allowed) {
        return NextResponse.json({ error: 'Subscription required', message: access.message, level: access.level, subscription: access.subscription }, { status: 403 })
      }

      const response = await handler(request, context)
      if (access.level === 'grace' && access.message) {
        response.headers.set('X-Subscription-Warning', access.message)
        response.headers.set('X-Subscription-Level', access.level)
      }
      return response
    } catch (error) {
      console.error('[SubscriptionGuard] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

export async function subscriptionCheck(
  request: NextRequest,
  requiredLevel: 'read' | 'write' = 'write'
): Promise<NextResponse | null> {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return enforceSubscription(ctx, requiredLevel)
}

/**
 * Enforce subscription access for an already-resolved AuthContext. Call this at
 * the top of mutating tenant handlers (after getAuthContext) to gate writes on
 * subscription status server-side:
 *
 *   const gate = await enforceSubscription(authCtx, 'write')
 *   if (gate) return gate
 *
 * Returns a 403 NextResponse when the tenant may not perform the action, or null
 * when the request may proceed. SUPER_ADMIN bypasses; a null tenantId is blocked.
 */
export async function enforceSubscription(
  ctx: AuthContext,
  requiredLevel: 'read' | 'write' = 'write'
): Promise<NextResponse | null> {
  if (ctx.isSuperAdmin) return null
  if (!ctx.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const access = await checkSubscriptionAccess(ctx.tenantId, requiredLevel)
  if (!access.allowed) {
    return NextResponse.json(
      { error: 'Subscription required', message: access.message, level: access.level },
      { status: 403 }
    )
  }
  return null
}

export async function getClientSubscriptionStatus(tenantId: string) {
  const access = await checkSubscriptionAccess(tenantId, 'read')
  return {
    level: access.level,
    message: access.message,
    showWarningBanner: access.level === 'grace',
    showUpgradePrompt: access.level === 'read_only',
    isBlocked: access.level === 'blocked',
    subscription: access.subscription
  }
}
