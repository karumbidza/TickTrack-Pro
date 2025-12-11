import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get a specific tenant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: true,
        _count: {
          select: {
            users: true,
            tickets: true,
            assets: true,
            contractors: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Failed to fetch tenant:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenant' },
      { status: 500 }
    )
  }
}

// PATCH - Update tenant (including disable/enable)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { isActive, status, name, email, phone, address, features } = body

    // Build update data
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (features !== undefined) updateData.features = features

    // Handle isActive toggle - convert to status
    if (isActive !== undefined) {
      updateData.status = isActive ? 'ACTIVE' : 'SUSPENDED'
    }

    // Direct status update
    if (status !== undefined) {
      updateData.status = status
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
      include: {
        subscription: true,
        _count: {
          select: {
            users: true,
            tickets: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Tenant updated successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        isActive: tenant.status === 'ACTIVE' || tenant.status === 'TRIAL',
        userCount: tenant._count.users,
        ticketCount: tenant._count.tickets
      }
    })
  } catch (error) {
    console.error('Failed to update tenant:', error)
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    )
  }
}

// DELETE - Delete tenant (soft delete by setting status to CANCELLED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Soft delete - set status to CANCELLED
    const tenant = await prisma.tenant.update({
      where: { id },
      data: { status: 'CANCELLED' }
    })

    return NextResponse.json({
      message: 'Tenant cancelled successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status
      }
    })
  } catch (error) {
    console.error('Failed to delete tenant:', error)
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 }
    )
  }
}
