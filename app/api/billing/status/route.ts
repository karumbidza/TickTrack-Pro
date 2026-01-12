import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkSubscriptionAccess } from '@/lib/subscription-guard'

/**
 * GET /api/billing/status
 * Returns subscription status for the current user's tenant
 * Used by SubscriptionProvider for client-side status checks
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Super admin always has full access
    if (session.user.role === 'SUPER_ADMIN') {
      return NextResponse.json({
        level: 'full',
        message: null,
        subscription: null
      })
    }

    if (!session.user.tenantId) {
      return NextResponse.json({
        level: 'full',
        message: 'No tenant associated',
        subscription: null
      })
    }

    const access = await checkSubscriptionAccess(session.user.tenantId, 'read')

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
