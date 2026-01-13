import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/billing
 * Returns comprehensive billing data for the tenant admin dashboard
 * 
 * Access: ADMIN (Tenant Admin) only
 * Super Admins should use /api/super-admin/tenants/[id] to view tenant billing
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Super Admin should manage billing from Super Admin dashboard, not here
    if (session.user.role === 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Tenant billing is managed from the Super Admin Dashboard',
        redirectTo: '/super-admin'
      }, { status: 403 })
    }

    // Only ADMIN (Tenant Admin) can access their billing
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Tenant Admin must have a tenant
    if (!session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with your account' }, { status: 400 })
    }

    const tenantId = session.user.tenantId

    // Get tenant info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId! },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        trialEndsAt: true
      }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: tenantId! }
    })

    // Get usage counts
    const [userCount, branchCount, assetCount] = await Promise.all([
      prisma.user.count({
        where: { 
          tenantId: tenantId!,
          isActive: true
        }
      }),
      prisma.branch.count({
        where: { 
          tenantId: tenantId!,
          isActive: true
        }
      }),
      prisma.asset.count({
        where: { 
          tenantId: tenantId!,
          status: { not: 'DECOMMISSIONED' }
        }
      })
    ])

    // Get plan limits based on subscription or defaults
    const planLimits = getPlanLimits(subscription?.plan || 'BASIC')

    // Get recent payments
    const payments = await prisma.payment.findMany({
      where: { tenantId: tenantId! },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        paidAt: true,
        dueDate: true,
        description: true,
        paymentMethod: true
      }
    })

    // Format response
    const response = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        trialEndsAt: tenant.trialEndsAt?.toISOString()
      },
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
        gracePeriodEnd: subscription.gracePeriodEnd?.toISOString(),
        trialEndsAt: subscription.trialEndsAt?.toISOString()
      } : null,
      usage: {
        users: {
          current: userCount,
          limit: planLimits.users
        },
        branches: {
          current: branchCount,
          limit: planLimits.branches
        },
        assets: {
          current: assetCount,
          limit: planLimits.assets
        }
      },
      payments: payments.map(p => ({
        id: p.id,
        invoiceNumber: p.invoiceNumber,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt?.toISOString(),
        dueDate: p.dueDate?.toISOString(),
        description: p.description
      }))
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching billing data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    )
  }
}

/**
 * Get plan limits based on subscription plan
 */
function getPlanLimits(plan: string) {
  const limits: Record<string, { users: number; branches: number; assets: number }> = {
    BASIC: { users: 10, branches: 3, assets: 100 },
    PRO: { users: 50, branches: 10, assets: 500 },
    ENTERPRISE: { users: -1, branches: -1, assets: -1 } // -1 means unlimited
  }
  return limits[plan] || limits.BASIC
}
