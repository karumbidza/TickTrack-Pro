import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendJobAssignedSMS } from '@/lib/africastalking-service'
import { sendJobAssignedEmailToContractor } from '@/lib/email'
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
    logger.info('Assign ticket request', { ticketId, contractorId, userTenantId: user.tenantId })
    
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
        },
        user: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    })

    if (!existingTicket) {
      // Debug: check if ticket exists at all
      const ticketCheck = await prisma.ticket.findUnique({ where: { id: ticketId } })
      logger.error('Ticket not found for assignment', { 
        ticketId, 
        userTenantId: user.tenantId,
        ticketExists: !!ticketCheck,
        ticketTenantId: ticketCheck?.tenantId
      })
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

    // Update ticket with contractor assignment and set assignedAt for SLA tracking
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: contractorId,
        status: status, // Use provided status (PROCESSING from admin assignment)
        assignedAt: existingTicket.assignedAt || new Date(), // Only set if not already assigned
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

    // Send SMS notification to contractor (both primary and secondary phones)
    const contractorPhones: string[] = []
    if (contractor.phone) contractorPhones.push(contractor.phone)
    if (contractor.contractorProfile?.secondaryPhone) {
      contractorPhones.push(contractor.contractorProfile.secondaryPhone)
    }

    if (contractorPhones.length > 0) {
      // Send SMS notification to all contractor phone numbers
      const smsData = {
        ticketNumber: existingTicket.ticketNumber || existingTicket.id.slice(-8),
        title: existingTicket.title,
        priority: existingTicket.priority,
        location: existingTicket.location || existingTicket.tenant?.name || 'N/A',
        userPhone: existingTicket.user?.phone || 'N/A',
        resolutionDeadline: existingTicket.resolutionDeadline
      }
      
      // Send to all phones (primary and secondary)
      for (const phone of contractorPhones) {
        sendJobAssignedSMS(phone, smsData).then(result => {
          if (result.success) {
            logger.info(`SMS sent to ${phone} for ticket ${existingTicket.ticketNumber}`)
          } else {
            logger.warn(`SMS failed for ${phone} on ticket ${existingTicket.ticketNumber}:`, result.results)
          }
        }).catch(err => {
          logger.error(`Notification sending error to ${phone}:`, err)
        })
      }
      
      logger.info(`SMS notifications sent to ${contractorPhones.length} phone(s) for contractor ${contractor.name}`)
    } else {
      logger.debug(`No phone numbers for contractor ${contractor.name}, skipping SMS`)
    }

    // Send email to contractor
    if (contractor.email) {
      sendJobAssignedEmailToContractor(contractor.email, {
        contractorName: contractor.name || 'Contractor',
        ticketNumber: existingTicket.ticketNumber || existingTicket.id.slice(-8),
        ticketTitle: existingTicket.title,
        ticketDescription: existingTicket.description || '',
        priority: existingTicket.priority,
        type: existingTicket.type || 'MAINTENANCE',
        location: existingTicket.location || existingTicket.tenant?.name || 'N/A',
        userName: existingTicket.user?.name || 'User',
        userPhone: existingTicket.user?.phone || 'N/A',
        resolutionDeadline: existingTicket.resolutionDeadline,
        companyName: existingTicket.tenant?.name || 'Company'
      }).catch(err => logger.error('Failed to send job assigned email:', err))
    }

    return NextResponse.json({ ticket: updatedTicket }, { status: 200 })
  } catch (error) {
    logger.error('Failed to assign ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}