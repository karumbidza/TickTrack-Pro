import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get available contractors for a specific category
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const ticketId = searchParams.get('ticketId')

    // Get user's tenant
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { tenantId: true, role: true }
    })

    if (!user?.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin
    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN', 'SUPER_ADMIN']
    if (!adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Build the query
    const whereClause: any = {
      tenantId: user.tenantId,
      status: 'AVAILABLE',
      user: {
        isActive: true
      }
    }

    // If categoryId is provided, filter by contractors who service that category and are available
    if (categoryId) {
      whereClause.contractorCategories = {
        some: {
          categoryId: categoryId,
          isAvailable: true
        }
      }
    }

    // Get contractors with their ratings and category info
    const contractors = await prisma.contractor.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        contractorCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          },
          where: {
            isAvailable: true
          }
        },
        ratings: {
          select: {
            punctualityRating: true,
            customerServiceRating: true,
            workmanshipRating: true,
            overallRating: true
          },
          take: 10,
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            ratings: true,
            maintenanceHistory: true
          }
        }
      },
      orderBy: {
        rating: 'desc'
      }
    })

    // Calculate detailed stats for each contractor
    const contractorsWithStats = contractors.map(contractor => {
      const ratings = contractor.ratings
      const avgPunctuality = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + (r.punctualityRating || 0), 0) / ratings.length 
        : 0
      const avgCustomerService = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + (r.customerServiceRating || 0), 0) / ratings.length 
        : 0
      const avgWorkmanship = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + (r.workmanshipRating || 0), 0) / ratings.length 
        : 0

      return {
        id: contractor.id,
        userId: contractor.user.id,
        name: contractor.user.name,
        email: contractor.user.email,
        phone: contractor.user.phone,
        bio: contractor.bio,
        specialties: contractor.specialties,
        rating: contractor.rating,
        totalJobs: contractor.totalJobs,
        status: contractor.status,
        categories: contractor.contractorCategories.map(cc => ({
          id: cc.category.id,
          name: cc.category.name,
          color: cc.category.color
        })),
        stats: {
          totalRatings: contractor._count.ratings,
          totalMaintenanceJobs: contractor._count.maintenanceHistory,
          avgPunctuality: avgPunctuality.toFixed(1),
          avgCustomerService: avgCustomerService.toFixed(1),
          avgWorkmanship: avgWorkmanship.toFixed(1)
        }
      }
    })

    // If auto-assign is requested, return the best contractor
    if (searchParams.get('autoAssign') === 'true' && contractorsWithStats.length > 0) {
      // Sort by rating and return the best one
      const bestContractor = contractorsWithStats[0]
      return NextResponse.json({ 
        contractors: contractorsWithStats,
        recommended: bestContractor
      })
    }

    return NextResponse.json({ contractors: contractorsWithStats })
  } catch (error) {
    console.error('Error fetching available contractors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
