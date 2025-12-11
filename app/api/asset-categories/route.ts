import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - List all asset categories for the tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const categories = await prisma.assetCategory.findMany({
      where: { 
        tenantId,
        isActive: true 
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: { assets: true }
        }
      }
    })

    return NextResponse.json({ categories })
  } catch (error) {
    logger.error('Error fetching asset categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST - Create a new asset category
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create categories
    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const { name, description, icon, color } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Check for duplicate name
    const existing = await prisma.assetCategory.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: name.trim()
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
    }

    // Get the next sort order
    const maxOrder = await prisma.assetCategory.aggregate({
      where: { tenantId },
      _max: { sortOrder: true }
    })

    const category = await prisma.assetCategory.create({
      data: {
        tenantId,
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || null,
        color: color || null,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1
      }
    })

    logger.info('Asset category created:', { id: category.id, name: category.name, tenantId })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    logger.error('Error creating asset category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
