import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendRatingEmailToContractor } from '@/lib/email'
import { logger } from '@/lib/logger'

const ratingSchema = z.object({
  punctualityRating: z.number().min(0).max(5), // Can be 0 if late without notice
  customerServiceRating: z.number().min(1).max(5),
  workmanshipRating: z.number().min(1).max(5),
  overallRating: z.number().min(1).max(5),
  ppeCompliant: z.boolean(),
  followedSiteProcedures: z.boolean(),
  additionalComments: z.string().optional(),
  
  // Optional detailed fields stored in JSON
  wasOnTime: z.boolean().optional(),
  notifiedOfDelays: z.boolean().optional(),
  preparedToStart: z.boolean().optional(),
  scheduledTime: z.string().optional(),
  actualArrival: z.string().optional(),
  ppeChecklist: z.object({
    hardHat: z.boolean(),
    safetyBoots: z.boolean(),
    reflectiveVest: z.boolean(),
    gloves: z.boolean(),
    safetyGoggles: z.boolean(),
    overalls: z.boolean()
  }).optional(),
  ppeComment: z.string().optional(),
  communicatedClearly: z.boolean().optional(),
  professionalAttitude: z.boolean().optional(),
  respectfulToStaff: z.boolean().optional(),
  patientAndSolutionOriented: z.boolean().optional(),
  workCompletedAsRequested: z.boolean().optional(),
  noShortcuts: z.boolean().optional(),
  cleanWorkArea: z.boolean().optional(),
  noReworkNeeded: z.boolean().optional(),
  signedInAtGate: z.boolean().optional(),
  loggedIntoJobCard: z.boolean().optional(),
  followedIsolationProcedures: z.boolean().optional(),
  followedWasteDisposal: z.boolean().optional(),
  beforeImages: z.array(z.string()).optional(),
  afterImages: z.array(z.string()).optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: ticketId } = await params
    const body = await request.json()
    
    const validatedData = ratingSchema.parse(body)

    // Get the ticket to verify ownership and get contractor info
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignedTo: {
          include: {
            contractorProfile: true // Get the Contractor record linked to the assigned user
          }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Only the ticket creator can rate the contractor
    if (ticket.userId !== session.user.id) {
      return NextResponse.json({ error: 'Only the ticket creator can rate the contractor' }, { status: 403 })
    }

    // Check if already rated
    const existingRating = await prisma.rating.findFirst({
      where: {
        ticketId: ticketId,
        userId: session.user.id
      }
    })

    if (existingRating) {
      return NextResponse.json({ error: 'You have already rated this ticket' }, { status: 400 })
    }

    // Get the contractor ID from the assigned user's contractor record
    const contractorId = ticket.assignedTo?.contractorProfile?.id || null

    // Store detailed rating data as JSON
    const ratingDetails = {
      wasOnTime: validatedData.wasOnTime,
      notifiedOfDelays: validatedData.notifiedOfDelays,
      preparedToStart: validatedData.preparedToStart,
      scheduledTime: validatedData.scheduledTime,
      actualArrival: validatedData.actualArrival,
      ppeChecklist: validatedData.ppeChecklist,
      ppeComment: validatedData.ppeComment,
      communicatedClearly: validatedData.communicatedClearly,
      professionalAttitude: validatedData.professionalAttitude,
      respectfulToStaff: validatedData.respectfulToStaff,
      patientAndSolutionOriented: validatedData.patientAndSolutionOriented,
      workCompletedAsRequested: validatedData.workCompletedAsRequested,
      noShortcuts: validatedData.noShortcuts,
      cleanWorkArea: validatedData.cleanWorkArea,
      noReworkNeeded: validatedData.noReworkNeeded,
      signedInAtGate: validatedData.signedInAtGate,
      loggedIntoJobCard: validatedData.loggedIntoJobCard,
      followedIsolationProcedures: validatedData.followedIsolationProcedures,
      followedWasteDisposal: validatedData.followedWasteDisposal,
      beforeImages: validatedData.beforeImages || [],
      afterImages: validatedData.afterImages || []
    }

    // Create the rating
    const rating = await prisma.rating.create({
      data: {
        ticketId: ticketId,
        userId: session.user.id,
        contractorId: contractorId,
        punctualityRating: validatedData.punctualityRating,
        customerServiceRating: validatedData.customerServiceRating,
        workmanshipRating: validatedData.workmanshipRating,
        overallRating: validatedData.overallRating,
        ppeCompliant: validatedData.ppeCompliant,
        followedSiteProcedures: validatedData.followedSiteProcedures,
        comment: validatedData.additionalComments,
        ratingDetails: ratingDetails
      }
    })

    // Update ticket status to CLOSED
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { 
        status: 'CLOSED',
        updatedAt: new Date()
      }
    })

    // Create status history entry
    await prisma.statusHistory.create({
      data: {
        ticketId: ticketId,
        fromStatus: ticket.status,
        toStatus: 'CLOSED',
        changedById: session.user.id,
        reason: 'Ticket rated and closed by user'
      }
    })

    // Update contractor's average rating if they have a contractor record
    if (contractorId) {
      const contractorRatings = await prisma.rating.findMany({
        where: { contractorId: contractorId },
        select: { overallRating: true }
      })

      const avgRating = contractorRatings.reduce((sum, r) => sum + r.overallRating, 0) / contractorRatings.length

      await prisma.contractor.update({
        where: { id: contractorId },
        data: {
          rating: avgRating,
          totalJobs: { increment: 1 }
        }
      })
    }

    // Send email to contractor with rating summary
    if (ticket.assignedTo?.email) {
      try {
        await sendRatingEmailToContractor({
          contractorEmail: ticket.assignedTo.email,
          contractorName: ticket.assignedTo.name || 'Contractor',
          ticketNumber: ticket.ticketNumber || ticketId,
          ticketTitle: ticket.title,
          overallRating: validatedData.overallRating,
          punctualityRating: validatedData.punctualityRating,
          customerServiceRating: validatedData.customerServiceRating,
          workmanshipRating: validatedData.workmanshipRating,
          ppeCompliant: validatedData.ppeCompliant,
          followedSiteProcedures: validatedData.followedSiteProcedures,
          comments: validatedData.additionalComments || ''
        })
      } catch (emailError) {
        logger.error('Failed to send rating email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      rating,
      message: 'Rating submitted successfully. Ticket has been closed.'
    })
  } catch (error) {
    logger.error('Rating submission error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid rating data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 })
  }
}

// Get ratings for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: ticketId } = await params

    const ratings = await prisma.rating.findMany({
      where: { ticketId: ticketId },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ ratings })
  } catch (error) {
    logger.error('Rating fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
  }
}
