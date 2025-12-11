import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - User approves or rejects work description
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { approved, rejectionReason } = await request.json()

    if (typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Approval status is required' }, { status: 400 })
    }

    if (!approved && (!rejectionReason || rejectionReason.trim().length === 0)) {
      return NextResponse.json({ error: 'Rejection reason is required when rejecting' }, { status: 400 })
    }

    // Get the ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: params.id
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if user owns the ticket or is an admin
    const isOwner = ticket.userId === session.user.id
    const isAdmin = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(session.user.role)

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'You do not have permission to approve this work description' }, { status: 403 })
    }

    // Check if ticket is in the correct status
    if (ticket.status !== 'AWAITING_WORK_APPROVAL') {
      return NextResponse.json({ 
        error: 'Ticket is not waiting for work approval. Current status: ' + ticket.status 
      }, { status: 400 })
    }

    if (approved) {
      // Approve the work description - move to COMPLETED
      const updatedTicket = await prisma.ticket.update({
        where: { id: params.id },
        data: {
          workDescriptionApproved: true,
          workDescriptionApprovedAt: new Date(),
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          asset: {
            select: { id: true, name: true, assetNumber: true, location: true }
          },
          attachments: true,
          _count: { select: { messages: true } }
        }
      })

      // Create status history entry
      await prisma.statusHistory.create({
        data: {
          ticketId: params.id,
          fromStatus: 'AWAITING_WORK_APPROVAL',
          toStatus: 'COMPLETED',
          changedById: session.user.id,
          reason: 'User approved the work description'
        }
      })

      // Create a message about the approval
      await prisma.message.create({
        data: {
          content: `**Work Description Approved ✓**\n\n${session.user.name || session.user.email} has approved the work description. The contractor can now upload an invoice.`,
          ticketId: params.id,
          userId: session.user.id
        }
      })

      // Notify contractor that work is approved and they can upload invoice
      if (ticket.assignedToId) {
        await prisma.notification.create({
          data: {
            userId: ticket.assignedToId,
            type: 'WORK_APPROVED',
            title: 'Work Description Approved',
            message: `Your work description for ticket ${ticket.ticketNumber} has been approved. You can now upload an invoice.`,
            data: JSON.stringify({
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber
            })
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Work description approved. Contractor can now upload invoice.',
        ticket: updatedTicket
      })

    } else {
      // Reject the work description - back to AWAITING_DESCRIPTION
      const updatedTicket = await prisma.ticket.update({
        where: { id: params.id },
        data: {
          workDescriptionApproved: false,
          workDescriptionRejectionReason: rejectionReason.trim(),
          workDescription: null, // Clear the description so contractor can resubmit
          workDescriptionSubmittedAt: null,
          status: 'AWAITING_DESCRIPTION',
          updatedAt: new Date()
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          asset: {
            select: { id: true, name: true, assetNumber: true, location: true }
          },
          attachments: true,
          _count: { select: { messages: true } }
        }
      })

      // Create status history entry
      await prisma.statusHistory.create({
        data: {
          ticketId: params.id,
          fromStatus: 'AWAITING_WORK_APPROVAL',
          toStatus: 'AWAITING_DESCRIPTION',
          changedById: session.user.id,
          reason: `User rejected the work description: ${rejectionReason}`
        }
      })

      // Create a message about the rejection
      await prisma.message.create({
        data: {
          content: `**Work Description Rejected ✗**\n\n${session.user.name || session.user.email} has rejected the work description.\n\n**Reason:** ${rejectionReason}\n\nContractor must provide a revised description.`,
          ticketId: params.id,
          userId: session.user.id
        }
      })

      // Notify contractor that description was rejected
      if (ticket.assignedToId) {
        await prisma.notification.create({
          data: {
            userId: ticket.assignedToId,
            type: 'WORK_REJECTED',
            title: 'Work Description Rejected',
            message: `Your work description for ticket ${ticket.ticketNumber} was rejected. Reason: ${rejectionReason}. Please submit a revised description.`,
            data: JSON.stringify({
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              rejectionReason: rejectionReason
            })
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Work description rejected. Contractor notified to provide a revised description.',
        ticket: updatedTicket
      })
    }

  } catch (error) {
    console.error('Failed to process work description approval:', error)
    return NextResponse.json(
      { error: 'Failed to process work description approval' },
      { status: 500 }
    )
  }
}
