import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'CONTRACTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get contractor profile
    const contractor = await prisma.contractor.findUnique({
      where: { userId: session.user.id },
      include: {
        ratings: {
          orderBy: { createdAt: 'desc' },
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true
              }
            },
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 })
    }

    // Calculate aggregate ratings
    const ratings = contractor.ratings
    const totalRatings = ratings.length
    
    let avgPunctuality = 0
    let avgCustomerService = 0
    let avgWorkmanship = 0
    let avgOverall = 0
    let ppeComplianceRate = 0
    let procedureComplianceRate = 0

    if (totalRatings > 0) {
      avgPunctuality = ratings.reduce((sum, r) => sum + r.punctualityRating, 0) / totalRatings
      avgCustomerService = ratings.reduce((sum, r) => sum + r.customerServiceRating, 0) / totalRatings
      avgWorkmanship = ratings.reduce((sum, r) => sum + r.workmanshipRating, 0) / totalRatings
      avgOverall = ratings.reduce((sum, r) => sum + r.overallRating, 0) / totalRatings
      ppeComplianceRate = (ratings.filter(r => r.ppeCompliant).length / totalRatings) * 100
      procedureComplianceRate = (ratings.filter(r => r.followedSiteProcedures).length / totalRatings) * 100
    }

    return NextResponse.json({
      profile: {
        id: contractor.id,
        specialties: contractor.specialties,
        hourlyRate: contractor.hourlyRate,
        rating: contractor.rating,
        totalJobs: contractor.totalJobs,
        status: contractor.status,
        bio: contractor.bio,
        certifications: contractor.certifications
      },
      ratingStats: {
        totalRatings,
        avgPunctuality: Math.round(avgPunctuality * 10) / 10,
        avgCustomerService: Math.round(avgCustomerService * 10) / 10,
        avgWorkmanship: Math.round(avgWorkmanship * 10) / 10,
        avgOverall: Math.round(avgOverall * 10) / 10,
        ppeComplianceRate: Math.round(ppeComplianceRate),
        procedureComplianceRate: Math.round(procedureComplianceRate)
      },
      recentRatings: ratings.slice(0, 10).map(r => ({
        id: r.id,
        ticketId: r.ticketId,
        ticketNumber: r.ticket.ticketNumber,
        ticketTitle: r.ticket.title,
        ratedBy: r.user.name,
        punctuality: r.punctualityRating,
        customerService: r.customerServiceRating,
        workmanship: r.workmanshipRating,
        overall: r.overallRating,
        ppeCompliant: r.ppeCompliant,
        followedProcedures: r.followedSiteProcedures,
        comments: r.comment,
        createdAt: r.createdAt
      }))
    })
  } catch (error) {
    console.error('Error fetching contractor profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
