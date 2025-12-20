import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendJobAssignedSMS } from '@/lib/africastalking-service'
import { sendJobAssignedEmailToContractor } from '@/lib/email'

// POST - Approve or reject a quote
export async function POST(
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

    const ticketId = params.id
    const { action, rejectionReason } = await request.json()

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject' }, { status: 400 })
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Get the ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        tenantId: session.user.tenantId,
        status: 'QUOTE_SUBMITTED' as any
      },
      include: {
        assignedTo: {
          include: {
            contractorProfile: {
              select: { secondaryPhone: true }
            }
          }
        },
        tenant: {
          select: { name: true }
        },
        user: {
          select: { id: true, name: true, phone: true }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found or no quote pending' }, { status: 404 })
    }

    if (action === 'approve') {
      // Approve quote and move to PROCESSING (normal assignment flow)
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'PROCESSING' as any,
          quoteApproved: true,
          quoteApprovedAt: new Date(),
          updatedAt: new Date()
        } as any,
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true, phone: true } },
          asset: true
        }
      })

      // Create message (internal - not visible to end user)
      await prisma.message.create({
        data: {
          content: `Quote approved ($${(ticket as any).quoteAmount?.toFixed(2)}). Job is now assigned to contractor.`,
          ticketId,
          userId: session.user.id,
          isInternal: true
        }
      })

      // Send notifications to contractor that job is now assigned
      const contractor = (ticket as any).assignedTo
      if (contractor) {
        const contractorPhones: string[] = []
        if (contractor.phone) contractorPhones.push(contractor.phone)
        if (contractor.contractorProfile?.secondaryPhone) {
          contractorPhones.push(contractor.contractorProfile.secondaryPhone)
        }

        // Send SMS
        if (contractorPhones.length > 0) {
          const smsData = {
            ticketNumber: ticket.ticketNumber || ticket.id.slice(-8),
            title: ticket.title,
            priority: ticket.priority,
            location: ticket.location || (ticket as any).tenant?.name || 'N/A',
            userPhone: (ticket as any).reporterContact || (ticket as any).user?.phone || 'N/A',
            resolutionDeadline: ticket.resolutionDeadline
          }
          
          for (const phone of contractorPhones) {
            sendJobAssignedSMS(phone, smsData).catch(err => {
              logger.error(`SMS failed for ${phone}:`, err)
            })
          }
        }

        // Send email
        if (contractor.email) {
          sendJobAssignedEmailToContractor(contractor.email, {
            contractorName: contractor.name || 'Contractor',
            ticketNumber: ticket.ticketNumber || ticket.id.slice(-8),
            ticketTitle: ticket.title,
            ticketDescription: ticket.description || '',
            priority: ticket.priority,
            type: ticket.type || 'MAINTENANCE',
            location: ticket.location || (ticket as any).tenant?.name || 'N/A',
            userName: (ticket as any).reporterName || (ticket as any).user?.name || 'User',
            userPhone: (ticket as any).reporterContact || (ticket as any).user?.phone || 'N/A',
            resolutionDeadline: ticket.resolutionDeadline,
            companyName: (ticket as any).tenant?.name || 'Company'
          }).catch(err => logger.error('Failed to send email:', err))
        }
      }

      logger.info('Quote approved', { ticketId, quoteAmount: (ticket as any).quoteAmount })
      return NextResponse.json({ ticket: updatedTicket, message: 'Quote approved' })

    } else {
      // Reject quote - back to AWAITING_QUOTE status
      if (!rejectionReason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'AWAITING_QUOTE' as any,
          quoteApproved: false,
          quoteRejectionReason: rejectionReason,
          // Clear quote details so contractor can resubmit
          quoteAmount: null,
          quoteDescription: null,
          quoteFileUrl: null,
          quoteSubmittedAt: null,
          updatedAt: new Date()
        } as any,
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          asset: true
        }
      })

      // Create message (internal - not visible to end user)
      await prisma.message.create({
        data: {
          content: `Quote rejected. Reason: ${rejectionReason}. Please submit a revised quote.`,
          ticketId,
          userId: session.user.id,
          isInternal: true
        }
      })

      logger.info('Quote rejected', { ticketId, reason: rejectionReason })
      return NextResponse.json({ ticket: updatedTicket, message: 'Quote rejected' })
    }
  } catch (error) {
    logger.error('Failed to process quote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
