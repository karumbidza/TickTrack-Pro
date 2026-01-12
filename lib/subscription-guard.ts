/**
 * SUBSCRIPTION ACCESS GUARD
 * ==========================
 * Centralized access control based on subscription status.
 * 
 * RULES:
 * - ACTIVE/TRIAL → full access
 * - GRACE → full access + warning
 * - READ_ONLY → view/export only (no create/update/delete)
 * - SUSPENDED → block all access
 * 
 * Usage:
 * - API routes: withSubscriptionGuard(handler)
 * - Pages: use middleware.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
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

/**
 * Check subscription access for a tenant
 * This is the SINGLE function for all access checks
 */
export async function checkSubscriptionAccess(
  tenantId: string,
  requiredLevel: 'read' | 'write' = 'write'
): Promise<SubscriptionAccessResult> {
  
  // Get subscription
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId }
  })
  
  // No subscription = treat as trial expired
  if (!subscription) {
    return {
      allowed: false,
      level: 'blocked',
      message: 'No active subscription found. Please subscribe to continue.'
    }
  }
  
  const status = subscription.status
  const now = new Date()
  
  // Calculate days remaining
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
  
  // SUSPENDED - always blocked
  if (status === 'SUSPENDED') {
    return {
      allowed: false,
      level: 'blocked',
      message: 'Your account has been suspended. Please contact support.',
      subscription: subscriptionInfo
    }
  }
  
  // READ_ONLY - only allow read operations
  if (status === 'READ_ONLY' || status === 'EXPIRED') {
    if (requiredLevel === 'write') {
      return {
        allowed: false,
        level: 'read_only',
        message: 'Your subscription has expired. You can view data but cannot make changes. Please renew to continue.',
        subscription: subscriptionInfo
      }
    }
    return {
      allowed: true,
      level: 'read_only',
      message: 'Your subscription has expired. Please renew to unlock full access.',
      subscription: subscriptionInfo
    }
  }
  
  // GRACE - full access but with warning
  if (status === 'GRACE' || status === 'PAST_DUE') {
    const graceDaysRemaining = subscription.gracePeriodEnd
      ? Math.max(0, Math.ceil((subscription.gracePeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      : 0
    
    return {
      allowed: true,
      level: 'grace',
      message: `Payment overdue. You have ${graceDaysRemaining} days remaining before access is restricted.`,
      subscription: subscriptionInfo
    }
  }
  
  // ACTIVE or TRIAL - full access
  if (status === 'ACTIVE' || status === 'TRIAL') {
    let message = undefined
    
    // Warn if trial ending soon
    if (status === 'TRIAL' && daysRemaining <= 3) {
      message = `Your trial ends in ${daysRemaining} days. Subscribe now to keep access.`
    }
    
    return {
      allowed: true,
      level: 'full',
      message,
      subscription: subscriptionInfo
    }
  }
  
  // CANCELLED, PAUSED, or unknown - block writes
  return {
    allowed: requiredLevel === 'read',
    level: 'read_only',
    message: 'Your subscription is inactive. Please renew to continue.',
    subscription: subscriptionInfo
  }
}

/**
 * Higher-order function to wrap API handlers with subscription guard
 * Use this for API routes that require subscription access
 */
type ApiHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse> | NextResponse

export function withSubscriptionGuard(
  handler: ApiHandler,
  options: {
    requiredLevel?: 'read' | 'write'
    skipForRoles?: string[]
  } = {}
): ApiHandler {
  const { requiredLevel = 'write', skipForRoles = ['SUPER_ADMIN'] } = options
  
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    try {
      const session = await getServerSession(authOptions)
      
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      // Skip check for super admin
      if (skipForRoles.includes(session.user.role)) {
        return handler(request, context)
      }
      
      // Check if user has a tenant
      if (!session.user.tenantId) {
        return NextResponse.json(
          { error: 'No tenant associated with user' },
          { status: 403 }
        )
      }
      
      // Check subscription access
      const access = await checkSubscriptionAccess(session.user.tenantId, requiredLevel)
      
      if (!access.allowed) {
        return NextResponse.json(
          {
            error: 'Subscription required',
            message: access.message,
            level: access.level,
            subscription: access.subscription
          },
          { status: 403 }
        )
      }
      
      // Add access info to response headers for client-side handling
      const response = await handler(request, context)
      
      if (access.level === 'grace' && access.message) {
        response.headers.set('X-Subscription-Warning', access.message)
        response.headers.set('X-Subscription-Level', access.level)
      }
      
      return response
      
    } catch (error) {
      console.error('[SubscriptionGuard] Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Standalone check for use in existing handlers
 * Returns null if allowed, or a 403 response if blocked
 */
export async function subscriptionCheck(
  request: NextRequest,
  requiredLevel: 'read' | 'write' = 'write'
): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Super admin bypasses all checks
  if (session.user.role === 'SUPER_ADMIN') {
    return null
  }
  
  if (!session.user.tenantId) {
    return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  }
  
  const access = await checkSubscriptionAccess(session.user.tenantId, requiredLevel)
  
  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'Subscription required',
        message: access.message,
        level: access.level
      },
      { status: 403 }
    )
  }
  
  return null // Allowed
}

/**
 * Get subscription status for client-side display
 * Use in pages to show warnings/banners
 */
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
