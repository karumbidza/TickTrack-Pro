import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure user has tenantId
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const whereClause = {
      role: 'CONTRACTOR' as const,
      tenantId: user.tenantId
    }

    // Run count and data query in parallel
    const [contractorUsers, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          contractorProfile: {
            select: {
              id: true,
              specialties: true,
              hourlyRate: true,
              status: true,
              rating: true,
              totalJobs: true,
              secondaryPhone: true,
              contractorCategories: {
                include: {
                  category: {
                    select: {
                      id: true,
                      name: true,
                      color: true
                    }
                  }
                }
              },
              ratings: {
                select: {
                  punctualityRating: true,
                  customerServiceRating: true,
                  workmanshipRating: true,
                  overallRating: true,
                  ppeCompliant: true,
                  followedSiteProcedures: true
                }
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        },
        skip,
        take: limit
      }),
      prisma.user.count({ where: whereClause })
    ])

    // Find contractors without profiles and batch create them
    const contractorsWithoutProfiles = contractorUsers.filter(c => !c.contractorProfile)
    
    if (contractorsWithoutProfiles.length > 0) {
      await prisma.contractor.createMany({
        data: contractorsWithoutProfiles.map(c => ({
          userId: c.id,
          tenantId: user.tenantId!,
          specialties: ['General Maintenance'],
          status: 'AVAILABLE',
          rating: 0
        })),
        skipDuplicates: true
      })
      
      // Re-fetch contractors that were just created
      const newProfiles = await prisma.contractor.findMany({
        where: {
          userId: { in: contractorsWithoutProfiles.map(c => c.id) }
        },
        select: {
          id: true,
          userId: true,
          specialties: true,
          status: true,
          rating: true,
          totalJobs: true,
          secondaryPhone: true
        }
      })
      
      // Map new profiles to contractors
      const profileMap = new Map(newProfiles.map(p => [p.userId, p]))
      contractorsWithoutProfiles.forEach(c => {
        const profile = profileMap.get(c.id)
        if (profile) {
          (c as any).contractorProfile = {
            ...profile,
            hourlyRate: null,
            contractorCategories: [],
            ratings: []
          }
        }
      })
    }

    // Transform the data
    const enhancedContractors = contractorUsers.map(contractor => {
      const profile = contractor.contractorProfile
      
      if (!profile) {
        return {
          id: contractor.id,
          contractorProfileId: null,
          name: contractor.name,
          email: contractor.email,
          phone: contractor.phone || null,
          secondaryPhone: null,
          isActive: contractor.isActive,
          specializations: ['General Maintenance'],
          categories: [],
          rating: 0,
          totalJobs: 0,
          hourlyRate: null,
          isAvailable: contractor.isActive,
          ratingStats: {
            totalRatings: 0,
            avgPunctuality: 0,
            avgCustomerService: 0,
            avgWorkmanship: 0,
            avgOverall: 0,
            ppeComplianceRate: 0,
            procedureComplianceRate: 0
          }
        }
      }

      // Calculate rating statistics
      const ratings = profile.ratings || []
      const totalRatings = ratings.length
      let ratingStats = {
        totalRatings: 0,
        avgPunctuality: 0,
        avgCustomerService: 0,
        avgWorkmanship: 0,
        avgOverall: 0,
        ppeComplianceRate: 0,
        procedureComplianceRate: 0
      }
      
      if (totalRatings > 0) {
        ratingStats = {
          totalRatings,
          avgPunctuality: Number((ratings.reduce((sum: number, r: any) => sum + r.punctualityRating, 0) / totalRatings).toFixed(1)),
          avgCustomerService: Number((ratings.reduce((sum: number, r: any) => sum + r.customerServiceRating, 0) / totalRatings).toFixed(1)),
          avgWorkmanship: Number((ratings.reduce((sum: number, r: any) => sum + r.workmanshipRating, 0) / totalRatings).toFixed(1)),
          avgOverall: Number((ratings.reduce((sum: number, r: any) => sum + r.overallRating, 0) / totalRatings).toFixed(1)),
          ppeComplianceRate: Math.round((ratings.filter((r: any) => r.ppeCompliant).length / totalRatings) * 100),
          procedureComplianceRate: Math.round((ratings.filter((r: any) => r.followedSiteProcedures).length / totalRatings) * 100)
        }
      }

      return {
        id: contractor.id,
        contractorProfileId: profile.id,
        name: contractor.name,
        email: contractor.email,
        phone: contractor.phone || null,
        secondaryPhone: profile.secondaryPhone || null,
        isActive: contractor.isActive,
        specializations: profile.specialties || [],
        categories: (profile.contractorCategories || []).map((cc: any) => ({
          id: cc.category.id,
          name: cc.category.name,
          color: cc.category.color,
          isAvailable: cc.isAvailable
        })),
        rating: profile.rating || 0,
        totalJobs: profile.totalJobs || 0,
        hourlyRate: profile.hourlyRate || null,
        isAvailable: profile.status === 'AVAILABLE' && contractor.isActive,
        ratingStats
      }
    })

    return NextResponse.json({ 
      contractors: enhancedContractors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch contractors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}