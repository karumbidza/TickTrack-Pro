import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import FeatureGatingService from '@/lib/feature-gating'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { feature, plan } = body

    // Get user's tenant
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      )
    }

    let hasAccess = false

    if (feature) {
      // Check specific feature access
      hasAccess = await FeatureGatingService.canAccessFeature(user.tenant.id, feature)
    } else if (plan) {
      // Check plan access
      const tenantLimits = await FeatureGatingService.getTenantLimits(user.tenant.id)
      if (tenantLimits) {
        const planHierarchy = { 'BASIC': 1, 'PRO': 2, 'ENTERPRISE': 3, 'CUSTOM': 4 }
        const currentPlanLevel = planHierarchy[tenantLimits.plan as keyof typeof planHierarchy] || 0
        const requiredPlanLevel = planHierarchy[plan as keyof typeof planHierarchy] || 0
        hasAccess = currentPlanLevel >= requiredPlanLevel || tenantLimits.status === 'TRIAL'
      }
    }

    // Get tenant limits for response
    const tenantLimits = await FeatureGatingService.getTenantLimits(user.tenant.id)

    return NextResponse.json({
      hasAccess,
      tenantLimits
    })

  } catch (error) {
    console.error('Feature check error:', error)
    return NextResponse.json(
      { message: 'Failed to check feature access' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// GET endpoint for getting current tenant limits
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's tenant
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Get tenant limits
    const tenantLimits = await FeatureGatingService.getTenantLimits(user.tenant.id)
    
    if (!tenantLimits) {
      return NextResponse.json(
        { message: 'Could not fetch tenant limits' },
        { status: 404 }
      )
    }

    // Check trial status
    const trialDaysRemaining = await FeatureGatingService.getTrialDaysRemaining(user.tenant.id)
    const isTrialExpired = await FeatureGatingService.isTrialExpired(user.tenant.id)

    return NextResponse.json({
      ...tenantLimits,
      trialDaysRemaining,
      isTrialExpired
    })

  } catch (error) {
    console.error('Tenant limits fetch error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch tenant limits' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}