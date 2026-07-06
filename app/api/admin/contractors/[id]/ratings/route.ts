import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { requireTenantResource } from '@/lib/tenant-guard'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - Get all ratings for a contractor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, tenantId, role } = authCtx

    // Check if user is an admin
    const adminRoles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!adminRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: contractorId } = await params

    // Verify the contractor exists AND belongs to the caller's tenant (fails closed;
    // SUPER_ADMIN may cross tenants). Ratings are then safe to read by contractorId.
    const contractor = await requireTenantResource(prisma.contractor, contractorId, authCtx)

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // Get all ratings for this contractor
    const ratings = await prisma.rating.findMany({
      where: { contractorId: contractorId },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            ticketNumber: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ ratings })
  } catch (error) {
    console.error('Error fetching contractor ratings:', error)
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
  }
}
