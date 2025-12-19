import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendJobAssignedSMS } from '@/lib/africastalking-service'
import { sendMailWithNodemailer } from '@/lib/email'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { contractorIds, notes } = await request.json()
    const ticketId = params.id

    if (!contractorIds || !Array.isArray(contractorIds) || contractorIds.length === 0) {
      return NextResponse.json({ error: 'At least one contractor is required' }, { status: 400 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Verify ticket exists and belongs to user's tenant
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        tenantId: user.tenantId
      },
      include: {
        tenant: { select: { name: true } },
        user: { select: { id: true, name: true, phone: true } },
        asset: { select: { name: true, assetNumber: true } },
        category: { select: { name: true } },
        branch: { select: { name: true } }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot request quotes for a cancelled ticket' }, { status: 400 })
    }

    // Verify all contractors exist
    const contractors = await prisma.user.findMany({
      where: {
        id: { in: contractorIds },
        role: 'CONTRACTOR',
        tenantId: user.tenantId
      },
      include: {
        contractorProfile: {
          select: { secondaryPhone: true }
        }
      }
    })

    if (contractors.length !== contractorIds.length) {
      return NextResponse.json({ error: 'Some contractors were not found' }, { status: 404 })
    }

    // Create quote requests for each contractor
    const quoteRequests = await Promise.all(
      contractors.map(contractor => 
        prisma.quoteRequest.upsert({
          where: {
            ticketId_contractorId: {
              ticketId: ticketId,
              contractorId: contractor.id
            }
          },
          update: {
            status: 'pending',
            notes: notes || null,
            requestedBy: user.id,
            requestedAt: new Date(),
            quoteAmount: null,
            quoteDescription: null,
            quoteFileUrl: null,
            submittedAt: null,
            isAwarded: false,
            awardedAt: null,
            awardedBy: null
          },
          create: {
            ticketId: ticketId,
            contractorId: contractor.id,
            requestedBy: user.id,
            notes: notes || null,
            status: 'pending'
          }
        })
      )
    )

    // Update ticket status to AWAITING_QUOTE
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'AWAITING_QUOTE',
        quoteRequested: true,
        quoteRequestedAt: new Date()
      }
    })

    // Create a message about the quote request (internal - not visible to end user)
    const contractorNames = contractors.map(c => c.name || c.email).join(', ')
    await prisma.message.create({
      data: {
        content: `Quote requested from ${contractors.length} contractor(s): ${contractorNames}${notes ? `. Notes: ${notes}` : ''}`,
        ticketId,
        userId: user.id,
        isInternal: true
      }
    })

    // Send notifications to each contractor
    for (const contractor of contractors) {
      // Send email
      if (contractor.email) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">📋 Quote Request</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p>Hello <strong>${contractor.name || 'Contractor'}</strong>,</p>
              <p>You have received a quote request for the following ticket:</p>
              
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 5px 0;"><strong>Ticket #:</strong> ${ticket.ticketNumber || ticket.id.slice(-8)}</p>
                <p style="margin: 5px 0;"><strong>Title:</strong> ${ticket.title}</p>
                <p style="margin: 5px 0;"><strong>Priority:</strong> <span style="color: ${ticket.priority === 'CRITICAL' ? '#dc2626' : ticket.priority === 'HIGH' ? '#f59e0b' : '#22c55e'};">${ticket.priority}</span></p>
                <p style="margin: 5px 0;"><strong>Type:</strong> ${ticket.type}</p>
                ${ticket.asset ? `<p style="margin: 5px 0;"><strong>Asset:</strong> ${ticket.asset.name} (${ticket.asset.assetNumber})</p>` : ''}
                ${ticket.branch ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${ticket.branch.name}</p>` : ''}
                <p style="margin: 5px 0;"><strong>Company:</strong> ${ticket.tenant?.name || 'N/A'}</p>
              </div>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>📝 Description:</strong></p>
                <p style="margin: 10px 0 0 0;">${ticket.description || 'No description provided'}</p>
              </div>
              
              ${notes ? `
              <div style="background: #e0f2fe; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>💬 Admin Notes:</strong></p>
                <p style="margin: 10px 0 0 0;">${notes}</p>
              </div>
              ` : ''}
              
              <p style="color: #6b7280; font-size: 14px;">
                Please log in to the contractor portal to submit your quote. You may submit an estimated cost, description of work, and any supporting documents.
              </p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXTAUTH_URL}/contractor" 
                   style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Submit Your Quote
                </a>
              </div>
            </div>
            <div style="background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">This is an automated message from TickTrack Pro</p>
            </div>
          </div>
        `

        sendMailWithNodemailer({
          to: contractor.email,
          subject: `📋 Quote Request - Ticket #${ticket.ticketNumber || ticket.id.slice(-8)} - ${ticket.priority} Priority`,
          html: emailHtml,
          text: `Quote Request: ${ticket.title}. Please log in to submit your quote.`
        }).catch((err: Error) => logger.error('Failed to send quote request email:', err))
      }

      // Send SMS
      const contractorPhones: string[] = []
      if (contractor.phone) contractorPhones.push(contractor.phone)
      if (contractor.contractorProfile?.secondaryPhone) {
        contractorPhones.push(contractor.contractorProfile.secondaryPhone)
      }

      for (const phone of contractorPhones) {
        sendJobAssignedSMS(phone, {
          ticketNumber: ticket.ticketNumber || ticket.id.slice(-8),
          title: `QUOTE REQUEST: ${ticket.title}`,
          priority: ticket.priority,
          location: ticket.branch?.name || ticket.location || 'N/A',
          userPhone: ticket.user?.phone || 'N/A',
          resolutionDeadline: ticket.resolutionDeadline
        }).catch(err => logger.error('Failed to send quote request SMS:', err))
      }
    }

    logger.info(`Quote requests sent to ${contractors.length} contractors for ticket ${ticket.ticketNumber}`)

    return NextResponse.json({ 
      success: true,
      message: `Quote requests sent to ${contractors.length} contractor(s)`,
      quoteRequests: quoteRequests.length
    })

  } catch (error) {
    logger.error('Failed to request quotes:', error)
    return NextResponse.json({ error: 'Failed to request quotes' }, { status: 500 })
  }
}

// GET: Retrieve quote requests for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const ticketId = params.id

    // Get quote requests for this ticket
    const quoteRequests = await prisma.quoteRequest.findMany({
      where: { ticketId },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            contractorProfile: {
              select: {
                rating: true,
                totalJobs: true
              }
            }
          }
        },
        requestedByUser: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { isAwarded: 'desc' },
        { submittedAt: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ quoteRequests })

  } catch (error) {
    logger.error('Failed to fetch quote requests:', error)
    return NextResponse.json({ error: 'Failed to fetch quote requests' }, { status: 500 })
  }
}
