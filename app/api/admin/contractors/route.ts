import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
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

    // Fetch all contractor users for this tenant
    const contractorUsers = await prisma.user.findMany({
      where: {
        role: 'CONTRACTOR',
        tenantId: user.tenantId
      },
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
            secondaryPhone: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform the data and create missing contractor profiles
    const enhancedContractors = []
    
    for (const contractor of contractorUsers) {
      let profile = contractor.contractorProfile
      
      // If no profile exists, create a default one
      if (!profile) {
        const createdProfile = await prisma.contractor.create({
          data: {
            userId: contractor.id,
            tenantId: user.tenantId,
            specialties: ['General Maintenance'], // Default specialty
            hourlyRate: null,
            status: 'AVAILABLE',
            rating: 0
          }
        })
        profile = { ...createdProfile, totalJobs: 0 }
      }
      
      enhancedContractors.push({
        id: contractor.id, // User ID for assignment
        odString: contractor.id, // Original user ID (deprecated)
        contractorProfileId: profile.id, // Contractor profile ID for ratings lookup
        name: contractor.name,
        email: contractor.email,
        phone: contractor.phone || null,
        secondaryPhone: profile.secondaryPhone || null,
        isActive: contractor.isActive,
        specializations: profile.specialties || [],
        rating: profile.rating || 0,
        totalJobs: profile.totalJobs || 0,
        hourlyRate: profile.hourlyRate || null,
        isAvailable: profile.status === 'AVAILABLE' && contractor.isActive
      })
    }

    return NextResponse.json({ contractors: enhancedContractors }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch contractors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}