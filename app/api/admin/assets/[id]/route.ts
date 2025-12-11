import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get single asset with full history
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const asset = await prisma.asset.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        tenant: {
          select: { id: true, name: true }
        },
        decommissionRequestedBy: {
          select: { id: true, name: true, email: true }
        },
        decommissionApprovedBy: {
          select: { id: true, name: true, email: true }
        },
        decommissionRejectedBy: {
          select: { id: true, name: true, email: true }
        },
        tickets: {
          include: {
            invoice: true,
            assignedTo: {
              select: { id: true, name: true, email: true }
            },
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        maintenanceHistory: {
          include: {
            contractor: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              }
            }
          },
          orderBy: { performedDate: 'desc' }
        },
        assetHistory: {
          include: {
            performedBy: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Verify tenant access for non-super admins
    if (user.role !== 'SUPER_ADMIN' && asset.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate costs
    const totalRepairCost = asset.tickets.reduce((sum, ticket) => {
      return sum + (ticket.invoice?.amount || 0)
    }, 0)
    
    const maintenanceCost = asset.maintenanceHistory.reduce((sum, mh) => {
      return sum + (mh.cost || 0)
    }, 0)

    return NextResponse.json({
      asset: {
        ...asset,
        totalRepairCost,
        totalMaintenanceCost: maintenanceCost,
        totalCost: totalRepairCost + maintenanceCost + (asset.purchasePrice || 0)
      }
    })
  } catch (error) {
    console.error('Error fetching asset:', error)
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 })
  }
}

// PATCH - Update asset or approve/reject decommission
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const asset = await prisma.asset.findUnique({
      where: { id: params.id }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Verify tenant access for non-super admins
    if (user.role !== 'SUPER_ADMIN' && asset.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, reason, ...updateData } = body

    // Handle decommission approval/rejection
    if (action === 'approve_decommission') {
      if (asset.status !== 'PENDING_DECOMMISSION') {
        return NextResponse.json({ error: 'Asset is not pending decommission' }, { status: 400 })
      }

      const updatedAsset = await prisma.asset.update({
        where: { id: params.id },
        data: {
          status: 'DECOMMISSIONED',
          decommissionedAt: new Date(),
          decommissionApprovedAt: new Date(),
          decommissionApprovedById: session.user.id
        }
      })

      // Create history entry
      await prisma.assetHistory.create({
        data: {
          assetId: params.id,
          action: 'DECOMMISSION_APPROVED',
          description: `Decommission approved by admin. Reason: ${asset.decommissionReason || 'No reason provided'}`,
          performedById: session.user.id,
          previousValue: { status: 'PENDING_DECOMMISSION' },
          newValue: { status: 'DECOMMISSIONED' }
        }
      })

      return NextResponse.json({ asset: updatedAsset, message: 'Decommission approved' })
    }

    if (action === 'reject_decommission') {
      if (asset.status !== 'PENDING_DECOMMISSION') {
        return NextResponse.json({ error: 'Asset is not pending decommission' }, { status: 400 })
      }

      const updatedAsset = await prisma.asset.update({
        where: { id: params.id },
        data: {
          status: 'ACTIVE', // Restore to active
          decommissionRejectedAt: new Date(),
          decommissionRejectedById: session.user.id,
          decommissionRejectionReason: reason || 'Rejected by admin',
          // Clear the request fields
          decommissionRequestedAt: null,
          decommissionRequestedById: null,
          decommissionReason: null
        }
      })

      // Create history entry
      await prisma.assetHistory.create({
        data: {
          assetId: params.id,
          action: 'DECOMMISSION_REJECTED',
          description: `Decommission rejected by admin. Reason: ${reason || 'No reason provided'}`,
          performedById: session.user.id,
          previousValue: { status: 'PENDING_DECOMMISSION' },
          newValue: { status: 'ACTIVE' }
        }
      })

      return NextResponse.json({ asset: updatedAsset, message: 'Decommission rejected' })
    }

    // Regular update
    const updatedAsset = await prisma.asset.update({
      where: { id: params.id },
      data: updateData
    })

    // Create history entry for updates
    if (Object.keys(updateData).length > 0) {
      await prisma.assetHistory.create({
        data: {
          assetId: params.id,
          action: 'UPDATED',
          description: `Asset details updated`,
          performedById: session.user.id,
          previousValue: asset,
          newValue: updatedAsset
        }
      })
    }

    return NextResponse.json({ asset: updatedAsset })
  } catch (error) {
    console.error('Error updating asset:', error)
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
  }
}
