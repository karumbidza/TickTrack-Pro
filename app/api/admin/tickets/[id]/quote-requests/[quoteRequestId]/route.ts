import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendMailWithNodemailer } from '@/lib/email'
import { logger } from '@/lib/logger'

// POST: Award quote to contractor or take action on a quote request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; quoteRequestId: string } }
) {
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

    const { action, rejectionReason } = await request.json()
    const ticketId = params.id
    const quoteRequestId = params.quoteRequestId

    if (!action || !['award', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "award" or "reject"' }, { status: 400 })
    }

    // Get the quote request
    const quoteRequest = await prisma.quoteRequest.findFirst({
      where: {
        id: quoteRequestId,
        ticketId: ticketId
      },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        ticket: {
          include: {
            tenant: { select: { name: true } }
          }
        }
      }
    })

    if (!quoteRequest) {
      return NextResponse.json({ error: 'Quote request not found' }, { status: 404 })
    }

    if (action === 'award') {
      // Check if quote was submitted
      if (quoteRequest.status !== 'submitted') {
        return NextResponse.json({ error: 'Cannot award a quote that has not been submitted' }, { status: 400 })
      }

      // Use transaction to award this quote and reject others
      await prisma.$transaction(async (tx) => {
        // Award this quote
        await tx.quoteRequest.update({
          where: { id: quoteRequestId },
          data: {
            status: 'awarded',
            isAwarded: true,
            awardedAt: new Date(),
            awardedBy: user.id
          }
        })

        // Reject all other pending/submitted quotes for this ticket
        await tx.quoteRequest.updateMany({
          where: {
            ticketId: ticketId,
            id: { not: quoteRequestId },
            status: { in: ['pending', 'submitted'] }
          },
          data: {
            status: 'rejected',
            rejectionReason: 'Another contractor was awarded this job'
          }
        })

        // Assign the ticket to the winning contractor
        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            assignedToId: quoteRequest.contractorId,
            status: 'PROCESSING',
            assignedAt: new Date(),
            quoteApproved: true,
            quoteApprovedAt: new Date(),
            quoteAmount: quoteRequest.quoteAmount,
            quoteDescription: quoteRequest.quoteDescription
          }
        })

        // Create status history entry (internal - not visible to end user)
        await tx.message.create({
          data: {
            content: `Quote awarded to ${quoteRequest.contractor.name || quoteRequest.contractor.email}. Amount: ${quoteRequest.quoteAmount ? `$${quoteRequest.quoteAmount.toFixed(2)}` : 'N/A'}`,
            ticketId: ticketId,
            userId: user.id,
            isInternal: true
          }
        })
      })

      // Send notification to awarded contractor
      if (quoteRequest.contractor.email) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">🎉 Quote Awarded!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p>Congratulations <strong>${quoteRequest.contractor.name || 'Contractor'}</strong>!</p>
              <p>Your quote has been accepted for the following ticket:</p>
              
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
                <p style="margin: 5px 0;"><strong>Ticket #:</strong> ${quoteRequest.ticket.ticketNumber || quoteRequest.ticket.id.slice(-8)}</p>
                <p style="margin: 5px 0;"><strong>Title:</strong> ${quoteRequest.ticket.title}</p>
                <p style="margin: 5px 0;"><strong>Your Quote:</strong> ${quoteRequest.quoteAmount ? `$${quoteRequest.quoteAmount.toFixed(2)}` : 'N/A'}</p>
              </div>
              
              <p>The job is now assigned to you. Please proceed with the work and update the ticket status as you progress.</p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXTAUTH_URL}/contractor" 
                   style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View Job Details
                </a>
              </div>
            </div>
          </div>
        `

        sendMailWithNodemailer({
          to: quoteRequest.contractor.email,
          subject: `🎉 Quote Awarded - Ticket #${quoteRequest.ticket.ticketNumber || quoteRequest.ticket.id.slice(-8)}`,
          html: emailHtml,
          text: `Congratulations! Your quote has been accepted for ticket ${quoteRequest.ticket.ticketNumber}. Please log in to view details.`
        }).catch((err: Error) => logger.error('Failed to send award notification:', err))
      }

      logger.info(`Quote ${quoteRequestId} awarded to contractor ${quoteRequest.contractorId} for ticket ${ticketId}`)

      return NextResponse.json({ 
        success: true,
        message: `Quote awarded to ${quoteRequest.contractor.name || quoteRequest.contractor.email}`
      })

    } else if (action === 'reject') {
      // Reject this specific quote
      await prisma.quoteRequest.update({
        where: { id: quoteRequestId },
        data: {
          status: 'rejected',
          rejectionReason: rejectionReason || 'Quote rejected by admin'
        }
      })

      // Create message
      await prisma.message.create({
        data: {
          content: `Quote from ${quoteRequest.contractor.name || quoteRequest.contractor.email} was rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
          ticketId: ticketId,
          userId: user.id
        }
      })

      // Send rejection notification
      if (quoteRequest.contractor.email) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Quote Not Selected</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p>Hello <strong>${quoteRequest.contractor.name || 'Contractor'}</strong>,</p>
              <p>Unfortunately, your quote for the following ticket was not selected:</p>
              
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <p style="margin: 5px 0;"><strong>Ticket #:</strong> ${quoteRequest.ticket.ticketNumber || quoteRequest.ticket.id.slice(-8)}</p>
                <p style="margin: 5px 0;"><strong>Title:</strong> ${quoteRequest.ticket.title}</p>
                ${rejectionReason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
              </div>
              
              <p>Thank you for your submission. We look forward to working with you on future opportunities.</p>
            </div>
          </div>
        `

        sendMailWithNodemailer({
          to: quoteRequest.contractor.email,
          subject: `Quote Update - Ticket #${quoteRequest.ticket.ticketNumber || quoteRequest.ticket.id.slice(-8)}`,
          html: emailHtml,
          text: `Your quote for ticket ${quoteRequest.ticket.ticketNumber} was not selected.`
        }).catch((err: Error) => logger.error('Failed to send rejection notification:', err))
      }

      logger.info(`Quote ${quoteRequestId} rejected for ticket ${ticketId}`)

      return NextResponse.json({ 
        success: true,
        message: 'Quote rejected'
      })
    }

  } catch (error) {
    logger.error('Failed to process quote action:', error)
    return NextResponse.json({ error: 'Failed to process quote action' }, { status: 500 })
  }
}
