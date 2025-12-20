import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all assets for admin (across entire tenant)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Must be admin
    if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const branch = searchParams.get('branch')
    const search = searchParams.get('search')

    // Build where clause
    const where: any = {}
    
    // Super admin can see all, tenant admin sees only their tenant
    if (user.role !== 'SUPER_ADMIN' && user.tenantId) {
      where.tenantId = user.tenantId
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (category && category !== 'all') {
      where.categoryId = category
    }

    if (branch && branch !== 'all') {
      where.branchId = branch
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assetNumber: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } }
      ]
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        category: true,
        branch: {
          select: { id: true, name: true }
        },
        tenant: {
          select: { id: true, name: true }
        },
        decommissionRequestedBy: {
          select: { id: true, name: true, email: true }
        },
        decommissionApprovedBy: {
          select: { id: true, name: true, email: true }
        },
        tickets: {
          include: {
            invoices: {
              where: { isActive: true },
              select: {
                id: true,
                invoiceNumber: true,
                amount: true,
                status: true
              },
              take: 1
            },
            assignedTo: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        maintenanceHistory: {
          orderBy: { performedDate: 'desc' },
          take: 5
        },
        _count: {
          select: {
            tickets: true,
            maintenanceHistory: true,
            assetHistory: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Calculate total repair costs for each asset and format repair history
    const assetsWithCosts = assets.map(asset => {
      const totalRepairCost = asset.tickets.reduce((sum, ticket) => {
        return sum + (ticket.invoices?.[0]?.amount || 0)
      }, 0)
      
      const maintenanceCost = asset.maintenanceHistory.reduce((sum, mh) => {
        return sum + (mh.cost || 0)
      }, 0)

      // Format repair history with full details for admin
      const repairHistory = asset.tickets.map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        type: ticket.type,
        priority: ticket.priority,
        workDescription: ticket.workDescription,
        workDescriptionApproved: ticket.workDescriptionApproved,
        contractorId: ticket.assignedTo?.id || null,
        contractorName: ticket.assignedTo?.name || null,
        contractorEmail: ticket.assignedTo?.email || null,
        createdAt: ticket.createdAt.toISOString(),
        completedAt: ticket.completedAt?.toISOString() || null,
        invoiceId: ticket.invoices?.[0]?.id || null,
        invoiceNumber: ticket.invoices?.[0]?.invoiceNumber || null,
        invoiceAmount: ticket.invoices?.[0]?.amount || null,
        invoiceStatus: ticket.invoices?.[0]?.status || null
      }))

      return {
        ...asset,
        repairHistory,
        totalRepairCost,
        totalMaintenanceCost: maintenanceCost,
        totalCost: totalRepairCost + maintenanceCost
      }
    })

    // Get stats
    const stats = {
      total: assets.length,
      active: assets.filter(a => a.status === 'ACTIVE').length,
      maintenance: assets.filter(a => a.status === 'MAINTENANCE').length,
      pendingDecommission: assets.filter(a => a.status === 'PENDING_DECOMMISSION').length,
      decommissioned: assets.filter(a => a.status === 'DECOMMISSIONED').length,
      repairNeeded: assets.filter(a => a.status === 'REPAIR_NEEDED').length
    }

    return NextResponse.json({ assets: assetsWithCosts, stats })
  } catch (error) {
    console.error('Error fetching admin assets:', error)
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
  }
}
