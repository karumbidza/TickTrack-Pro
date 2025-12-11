import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get job details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'CONTRACTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: params.id,
        assignedToId: session.user.id
      },
      include: {
        tenant: {
          select: {
            name: true,
            address: true,
            phone: true
          }
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        asset: {
          select: {
            id: true,
            name: true,
            assetNumber: true,
            location: true,
            category: true
          }
        },
        attachments: true
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error fetching job details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Accept/Reject job or update status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'CONTRACTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, jobPlan } = body

    // Verify the job is assigned to this contractor
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: params.id,
        assignedToId: session.user.id
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Job not found or not assigned to you' }, { status: 404 })
    }

    if (action === 'accept') {
      // Validate required job plan fields
      if (!jobPlan?.arrivalDate || !jobPlan?.estimatedDuration || !jobPlan?.technicianName) {
        return NextResponse.json(
          { error: 'Job plan with arrival date, estimated duration, and technician name is required' },
          { status: 400 }
        )
      }

      // Update ticket to ACCEPTED status and store job plan
      const updatedTicket = await prisma.ticket.update({
        where: { id: params.id },
        data: {
          status: 'ACCEPTED',
          dueDate: new Date(jobPlan.arrivalDate),
          scheduledArrival: new Date(jobPlan.arrivalDate), // Store scheduled arrival for rating
          estimatedHours: parseFloat(jobPlan.estimatedDuration) || null,
        }
      })

      // Create a message with the job plan details
      await prisma.message.create({
        data: {
          content: `**Job Accepted by Contractor**\n\n` +
            `**Technician:** ${jobPlan.technicianName}\n` +
            `**Arrival Date:** ${new Date(jobPlan.arrivalDate).toLocaleDateString()}\n` +
            `**Estimated Duration:** ${jobPlan.estimatedDuration} hours\n` +
            `**Contact Number:** ${jobPlan.contactNumber || 'Not provided'}\n` +
            `**Notes:** ${jobPlan.notes || 'None'}`,
          ticketId: params.id,
          userId: session.user.id
        }
      })

      // Create status history entry
      await prisma.statusHistory.create({
        data: {
          ticketId: params.id,
          fromStatus: ticket.status as any,
          toStatus: 'ACCEPTED',
          changedById: session.user.id,
          reason: `Job accepted. Technician: ${jobPlan.technicianName}. Arrival: ${new Date(jobPlan.arrivalDate).toLocaleDateString()}`
        }
      })

      return NextResponse.json({
        message: 'Job accepted successfully',
        ticket: updatedTicket
      })
    }

    if (action === 'reject') {
      const { rejectionReason } = body

      if (!rejectionReason || rejectionReason.trim().length === 0) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      // Update ticket back to OPEN, unassign, and store rejection info
      const updatedTicket = await prisma.ticket.update({
        where: { id: params.id },
        data: {
          status: 'OPEN',
          assignedToId: null,
          rejectionReason: rejectionReason.trim(),
          rejectedAt: new Date()
        }
      })

      // Create a message with rejection reason
      await prisma.message.create({
        data: {
          content: `**Job Rejected by Contractor**\n\nReason: ${rejectionReason || 'No reason provided'}`,
          ticketId: params.id,
          userId: session.user.id
        }
      })

      // Create status history entry
      await prisma.statusHistory.create({
        data: {
          ticketId: params.id,
          fromStatus: ticket.status as any,
          toStatus: 'OPEN',
          changedById: session.user.id,
          reason: `Job rejected by contractor. Reason: ${rejectionReason || 'No reason provided'}`
        }
      })

      return NextResponse.json({
        message: 'Job rejected successfully',
        ticket: updatedTicket
      })
    }

    if (action === 'start') {
      const updatedTicket = await prisma.ticket.update({
        where: { id: params.id },
        data: { status: 'IN_PROGRESS' }
      })

      await prisma.statusHistory.create({
        data: {
          ticketId: params.id,
          fromStatus: ticket.status as any,
          toStatus: 'IN_PROGRESS',
          changedById: session.user.id,
          reason: 'Contractor started work on the job'
        }
      })

      return NextResponse.json({
        message: 'Job started',
        ticket: updatedTicket
      })
    }

    if (action === 'on_site') {
      const updatedTicket = await prisma.ticket.update({
        where: { id: params.id },
        data: { status: 'ON_SITE' }
      })

      await prisma.statusHistory.create({
        data: {
          ticketId: params.id,
          fromStatus: ticket.status as any,
          toStatus: 'ON_SITE',
          changedById: session.user.id,
          reason: 'Contractor arrived on site'
        }
      })

      return NextResponse.json({
        message: 'Status updated to on-site',
        ticket: updatedTicket
      })
    }

    if (action === 'complete') {
      const { actualHours, completionNotes } = body

      const updatedTicket = await prisma.ticket.update({
        where: { id: params.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actualHours: actualHours ? parseFloat(actualHours) : null
        }
      })

      if (completionNotes) {
        await prisma.message.create({
          data: {
            content: `**Job Completed**\n\nActual Hours: ${actualHours || 'Not recorded'}\n\nNotes: ${completionNotes}`,
            ticketId: params.id,
            userId: session.user.id
          }
        })
      }

      await prisma.statusHistory.create({
        data: {
          ticketId: params.id,
          fromStatus: ticket.status as any,
          toStatus: 'COMPLETED',
          changedById: session.user.id,
          reason: `Job completed. Actual hours: ${actualHours || 'Not recorded'}`
        }
      })

      return NextResponse.json({
        message: 'Job completed successfully',
        ticket: updatedTicket
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}