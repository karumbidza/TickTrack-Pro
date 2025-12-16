import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        tenant: {
          users: {
            some: {
              email: session.user.email
            }
          }
        }
      },
      include: {
        category: true
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    return NextResponse.json({ asset })
  } catch (error) {
    console.error('Error fetching asset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and tenant info
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    const body = await request.json()

    // Verify the asset belongs to the user's tenant
    const existingAsset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenant.id
      }
    })

    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    }

    // Handle status updates
    if (body.status) {
      updateData.status = body.status
    }

    // Handle decommission request fields (user requesting decommission)
    if (body.decommissionRequestedAt) {
      updateData.decommissionRequestedAt = new Date(body.decommissionRequestedAt)
      updateData.decommissionRequestedById = user.id
    }

    // Handle decommission fields
    if (body.decommissionedAt) {
      updateData.decommissionedAt = new Date(body.decommissionedAt)
    }
    if (body.decommissionReason) {
      updateData.decommissionReason = body.decommissionReason
    }

    // Handle transfer fields
    if (body.transferredAt) {
      updateData.transferredAt = new Date(body.transferredAt)
    }
    if (body.transferReason) {
      updateData.transferReason = body.transferReason
    }
    if (body.transferLocation) {
      updateData.transferLocation = body.transferLocation
    }
    if (body.transferredTo) {
      updateData.transferredTo = body.transferredTo
    }

    // Update location if provided (for transfers)
    if (body.location) {
      updateData.location = body.location
    }

    // Update other fields as needed
    const allowedFields = [
      'name', 'description', 'categoryId', 'brand', 'model', 'serialNumber',
      'location', 'specifications', 'images', 'manuals',
      'maintenanceInterval', 'purchasePrice', 'currentValue'
    ]

    // Date fields that need conversion
    const dateFields = ['purchaseDate', 'warrantyExpires', 'endOfLifeDate', 'lastMaintenanceDate', 'nextMaintenanceDate']

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    // Handle date fields - convert to proper DateTime or null
    dateFields.forEach(field => {
      if (body[field] !== undefined) {
        if (body[field] === null || body[field] === '') {
          updateData[field] = null
        } else {
          updateData[field] = new Date(body[field])
        }
      }
    })

    const updatedAsset = await prisma.asset.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: true
      }
    })

    // Create asset history entry for significant changes
    if (body.status && body.status !== existingAsset.status) {
      let action = 'STATUS_CHANGED'
      let description = `Status changed from ${existingAsset.status} to ${body.status}`
      
      if (body.status === 'PENDING_DECOMMISSION') {
        action = 'DECOMMISSION_REQUESTED'
        description = `Decommission requested. Reason: ${body.decommissionReason || 'No reason provided'}`
      } else if (body.status === 'TRANSFERRED') {
        action = 'TRANSFERRED'
        description = `Transferred to ${body.transferLocation || 'new location'}. Reason: ${body.transferReason || 'No reason provided'}`
      }
      
      await prisma.assetHistory.create({
        data: {
          assetId: params.id,
          action,
          description,
          performedById: user.id,
          previousValue: { status: existingAsset.status },
          newValue: { status: body.status }
        }
      })
    }

    return NextResponse.json({ asset: updatedAsset })
  } catch (error) {
    console.error('Error updating asset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and tenant info
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    // Verify the asset belongs to the user's tenant
    const existingAsset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenant.id
      }
    })

    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Instead of actual deletion, mark as decommissioned
    const updatedAsset = await prisma.asset.update({
      where: { id: params.id },
      data: {
        status: 'DECOMMISSIONED',
        decommissionedAt: new Date(),
        decommissionReason: 'Deleted via API',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ message: 'Asset decommissioned successfully' })
  } catch (error) {
    console.error('Error decommissioning asset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}