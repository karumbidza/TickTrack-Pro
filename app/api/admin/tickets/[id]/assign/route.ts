import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendTicketAssignmentDual } from '@/lib/africastalking-service'
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

    const { contractorId, notes, status = 'ASSIGNED' } = await request.json()
    const ticketId = params.id

    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor ID is required' }, { status: 400 })
    }

    // Ensure user has tenantId
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Verify ticket belongs to user's tenant and get full details
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        tenantId: user.tenantId
      },
      include: {
        tenant: {
          select: {
            name: true
          }
        }
      }
    })

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if ticket is cancelled - cannot assign cancelled tickets
    if (existingTicket.status === 'CANCELLED') {
      return NextResponse.json({ 
        error: 'Cannot assign contractor to a cancelled ticket' 
      }, { status: 400 })
    }

    // Verify contractor exists and get their phone numbers
    const contractor = await prisma.user.findFirst({
      where: {
        id: contractorId,
        role: 'CONTRACTOR',
        tenantId: user.tenantId
      },
      include: {
        contractorProfile: {
          select: {
            secondaryPhone: true
          }
        }
      }
    })

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // Update ticket with contractor assignment
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: contractorId,
        status: status, // Use provided status (PROCESSING from admin assignment)
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        asset: true
      }
    })

    // Create assignment message
    const assignmentMessage = `Ticket assigned to ${contractor.name || contractor.email} by ${user.name || user.email}`
    const fullMessage = notes ? `${assignmentMessage}. Notes: ${notes}` : assignmentMessage

    await prisma.message.create({
      data: {
        content: fullMessage,
        ticketId,
        userId: user.id
      }
    })

    // Send SMS notification to contractor
    const contractorPhones: string[] = []
    if (contractor.phone) contractorPhones.push(contractor.phone)
    if (contractor.contractorProfile?.secondaryPhone) {
      contractorPhones.push(contractor.contractorProfile.secondaryPhone)
    }

    if (contractorPhones.length > 0) {
      // Send SMS and WhatsApp notifications asynchronously - don't block the response
      sendTicketAssignmentDual({
        contractorName: contractor.name || 'Contractor',
        contractorPhones,
        ticketNumber: existingTicket.ticketNumber || existingTicket.id,
        ticketTitle: existingTicket.title,
        priority: existingTicket.priority,
        adminName: user.name || user.email || 'Admin',
        companyName: existingTicket.tenant?.name || 'Company',
        ticketId: existingTicket.id
      }).then(result => {
        if (result.sms.success) {
          logger.info(`SMS sent to contractor for ticket ${existingTicket.ticketNumber}`)
        } else {
          logger.warn(`SMS failed for ticket ${existingTicket.ticketNumber}:`, result.sms.results)
        }
        if (result.whatsapp.success) {
          logger.info(`WhatsApp sent to contractor for ticket ${existingTicket.ticketNumber}`)
        } else {
          logger.warn(`WhatsApp failed for ticket ${existingTicket.ticketNumber}:`, result.whatsapp.results)
        }
      }).catch(err => {
        logger.error('Notification sending error:', err)
      })
    } else {
      logger.debug(`No phone numbers for contractor ${contractor.name}, skipping notifications`)
    }

    return NextResponse.json({ ticket: updatedTicket }, { status: 200 })
  } catch (error) {
    logger.error('Failed to assign ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}