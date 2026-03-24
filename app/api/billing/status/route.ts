import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkSubscriptionAccess } from '@/lib/subscription-guard'

/**
 * GET /api/billing/status
 * Returns subscription status for the current user's tenant
 * Used by SubscriptionProvider for client-side status checks
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId, sessionClaims } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
    const userId = meta.dbUserId ?? clerkUserId
    const tenantId = meta.tenantId ?? null
    const role = (meta.role as string) ?? 'END_USER'

    // Super admin always has full access
    if (role === 'SUPER_ADMIN') {
      return NextResponse.json({
        level: 'full',
        message: null,
        subscription: null
      })
    }

    if (!tenantId) {
      return NextResponse.json({
        level: 'full',
        message: 'No tenant associated',
        subscription: null
      })
    }

    const access = await checkSubscriptionAccess(tenantId, 'read')

    return NextResponse.json({
      level: access.level,
      message: access.message,
      subscription: access.subscription
    })

  } catch (error) {
    console.error('Error fetching subscription status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}
