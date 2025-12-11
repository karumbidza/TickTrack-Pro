import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get a single location
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    const location = await prisma.location.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenant.id
      }
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({ location })
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a location
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'TENANT_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    const data = await request.json()

    // Verify location belongs to tenant
    const existing = await prisma.location.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenant.id
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Check for duplicate name if changing
    if (data.name && data.name.trim() !== existing.name) {
      const duplicate = await prisma.location.findFirst({
        where: {
          tenantId: user.tenant.id,
          name: data.name.trim(),
          id: { not: params.id }
        }
      })

      if (duplicate) {
        return NextResponse.json({ error: 'A location with this name already exists' }, { status: 400 })
      }
    }

    const location = await prisma.location.update({
      where: { id: params.id },
      data: {
        name: data.name?.trim() ?? existing.name,
        address: data.address?.trim() ?? existing.address,
        type: data.type ?? existing.type,
        isActive: data.isActive ?? existing.isActive,
        sortOrder: data.sortOrder ?? existing.sortOrder
      }
    })

    return NextResponse.json({ location })
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a location (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'TENANT_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    // Verify location belongs to tenant
    const existing = await prisma.location.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenant.id
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    await prisma.location.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
