import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get contractor's categories with availability status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get contractor profile
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        contractorProfile: {
          include: {
            contractorCategories: {
              include: {
                category: true
              }
            }
          }
        }
      }
    })

    if (!user?.contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      categories: user.contractorProfile.contractorCategories.map(cc => ({
        id: cc.id,
        categoryId: cc.categoryId,
        categoryName: cc.category.name,
        categoryColor: cc.category.color,
        categoryIcon: cc.category.icon,
        isAvailable: cc.isAvailable,
        updatedAt: cc.updatedAt
      }))
    })
  } catch (error) {
    console.error('Error fetching contractor categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Toggle availability for a specific category
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { categoryId, isAvailable } = await request.json()

    if (!categoryId || typeof isAvailable !== 'boolean') {
      return NextResponse.json({ error: 'categoryId and isAvailable are required' }, { status: 400 })
    }

    // Get contractor profile
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { contractorProfile: true }
    })

    if (!user?.contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 })
    }

    // Update or create the contractor category relationship
    const contractorCategory = await prisma.contractorCategory.upsert({
      where: {
        contractorId_categoryId: {
          contractorId: user.contractorProfile.id,
          categoryId: categoryId
        }
      },
      update: {
        isAvailable: isAvailable
      },
      create: {
        contractorId: user.contractorProfile.id,
        categoryId: categoryId,
        isAvailable: isAvailable
      },
      include: {
        category: true
      }
    })

    return NextResponse.json({
      message: `Availability for ${contractorCategory.category.name} updated to ${isAvailable ? 'Available' : 'Unavailable'}`,
      category: {
        id: contractorCategory.id,
        categoryId: contractorCategory.categoryId,
        categoryName: contractorCategory.category.name,
        isAvailable: contractorCategory.isAvailable
      }
    })
  } catch (error) {
    console.error('Error updating category availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
