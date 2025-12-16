import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get contractor's categories
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contractorId = params.id

    // Find the contractor user
    const contractor = await prisma.user.findUnique({
      where: { id: contractorId },
      include: {
        contractorProfile: true
      }
    })

    if (!contractor || !contractor.contractorProfile) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // Get contractor's categories
    const contractorCategories = await prisma.contractorCategory.findMany({
      where: {
        contractorId: contractor.contractorProfile.id
      },
      include: {
        category: true
      }
    })

    return NextResponse.json({ 
      categories: contractorCategories.map(cc => ({
        id: cc.category.id,
        name: cc.category.name,
        color: cc.category.color,
        isAvailable: cc.isAvailable
      }))
    })
  } catch (error) {
    console.error('Failed to fetch contractor categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update contractor's categories
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contractorId = params.id
    const { categoryIds } = await request.json()

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json({ error: 'categoryIds must be an array' }, { status: 400 })
    }

    // Find the contractor user
    const contractor = await prisma.user.findUnique({
      where: { id: contractorId },
      include: {
        contractorProfile: true
      }
    })

    if (!contractor || !contractor.contractorProfile) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // Ensure contractor belongs to same tenant (unless super admin)
    if (contractor.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contractorProfileId = contractor.contractorProfile.id

    // Use a transaction to update categories
    await prisma.$transaction(async (tx) => {
      // Delete existing category assignments
      await tx.contractorCategory.deleteMany({
        where: {
          contractorId: contractorProfileId
        }
      })

      // Create new category assignments
      if (categoryIds.length > 0) {
        await tx.contractorCategory.createMany({
          data: categoryIds.map((categoryId: string) => ({
            contractorId: contractorProfileId,
            categoryId: categoryId,
            isAvailable: true
          }))
        })
      }
    })

    // Fetch the updated categories
    const updatedCategories = await prisma.contractorCategory.findMany({
      where: {
        contractorId: contractorProfileId
      },
      include: {
        category: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      categories: updatedCategories.map(cc => ({
        id: cc.category.id,
        name: cc.category.name,
        color: cc.category.color,
        isAvailable: cc.isAvailable
      }))
    })
  } catch (error) {
    console.error('Failed to update contractor categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
