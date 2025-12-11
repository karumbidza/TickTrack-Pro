import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - Get a single category
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const category = await prisma.assetCategory.findFirst({
      where: {
        id: params.id,
        tenantId
      },
      include: {
        _count: {
          select: { assets: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    logger.error('Error fetching asset category:', error)
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 })
  }
}

// PATCH - Update a category
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const category = await prisma.assetCategory.findFirst({
      where: {
        id: params.id,
        tenantId
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const { name, description, icon, color, isActive, sortOrder } = await request.json()

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== category.name) {
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
    }

    const updatedCategory = await prisma.assetCategory.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder })
      }
    })

    logger.info('Asset category updated:', { id: updatedCategory.id, name: updatedCategory.name })

    return NextResponse.json({ category: updatedCategory })
  } catch (error) {
    logger.error('Error updating asset category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// DELETE - Delete a category (soft delete by setting isActive = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const category = await prisma.assetCategory.findFirst({
      where: {
        id: params.id,
        tenantId
      },
      include: {
        _count: {
          select: { assets: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Prevent deletion if category has assets
    if (category._count.assets > 0) {
      return NextResponse.json({ 
        error: `Cannot delete category. ${category._count.assets} asset(s) are using this category. Reassign them first.` 
      }, { status: 400 })
    }

    // Hard delete if no assets are using it
    await prisma.assetCategory.delete({
      where: { id: params.id }
    })

    logger.info('Asset category deleted:', { id: params.id, name: category.name })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    logger.error('Error deleting asset category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
