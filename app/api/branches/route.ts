import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all branches for tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    const branches = await prisma.branch.findMany({
      where: {
        tenantId: user.tenant.id,
        isActive: true
      },
      orderBy: [
        { isHeadOffice: 'desc' }, // Head office first
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ branches })
  } catch (error) {
    console.error('Error fetching branches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new branch
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is tenant admin
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

    if (!data.name?.trim()) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })
    }

    // Check for duplicate name
    const existing = await prisma.branch.findFirst({
      where: {
        tenantId: user.tenant.id,
        name: data.name.trim()
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'A branch with this name already exists' }, { status: 400 })
    }

    // If creating a head office, check if one already exists
    if (data.isHeadOffice) {
      const existingHQ = await prisma.branch.findFirst({
        where: {
          tenantId: user.tenant.id,
          isHeadOffice: true
        }
      })
      if (existingHQ) {
        return NextResponse.json({ error: 'A head office already exists. You can only have one head office.' }, { status: 400 })
      }
    }

    // Get max sort order
    const maxOrder = await prisma.branch.findFirst({
      where: { tenantId: user.tenant.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    })

    const branch = await prisma.branch.create({
      data: {
        tenantId: user.tenant.id,
        name: data.name.trim(),
        address: data.address?.trim() || null,
        type: data.isHeadOffice ? 'HEAD_OFFICE' : (data.type || 'BRANCH'),
        isHeadOffice: data.isHeadOffice || false,
        sortOrder: (maxOrder?.sortOrder || 0) + 1
      }
    })

    return NextResponse.json({ branch }, { status: 201 })
  } catch (error) {
    console.error('Error creating branch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
