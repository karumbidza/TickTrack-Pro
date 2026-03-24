import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - List all KYC applications
export async function GET(request: NextRequest) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const { userId, tenantId, role } = authCtx

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    if (!tenantId) {
      return NextResponse.json({ message: 'Invalid tenant' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      tenantId: tenantId
    }

    if (status) {
      where.status = status
    }

    const kycApplications = await prisma.contractorKYC.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        companyName: true,
        tradingName: true,
        companyEmail: true,
        companyPhone: true,
        physicalAddress: true,
        specializations: true,
        industrySectors: true,
        numberOfEmployees: true,
        reviewedAt: true,
        reviewNotes: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Get counts by status
    const counts = await prisma.contractorKYC.groupBy({
      by: ['status'],
      where: { tenantId: tenantId },
      _count: { id: true }
    })

    const statusCounts = {
      total: 0,
      PENDING: 0,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      ACTIVE: 0,
      REJECTED: 0,
      SUSPENDED: 0
    }

    counts.forEach(c => {
      statusCounts[c.status as keyof typeof statusCounts] = c._count.id
      statusCounts.total += c._count.id
    })

    return NextResponse.json({
      applications: kycApplications,
      counts: statusCounts
    })

  } catch (error) {
    console.error('Error fetching KYC applications:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
