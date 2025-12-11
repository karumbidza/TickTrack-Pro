import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

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

    // Get the ticket with scheduled arrival and status history
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        scheduledArrival: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        statusHistory: {
          where: {
            toStatus: 'ON_SITE'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Get the ON_SITE status change time (when user confirmed contractor on-site)
    const onSiteStatusChange = ticket.statusHistory[0]
    const onSiteTime = onSiteStatusChange?.createdAt || null

    return NextResponse.json({
      scheduledArrival: ticket.scheduledArrival,
      onSiteTime: onSiteTime,
      contractorName: ticket.assignedTo?.name || null,
      contractorEmail: ticket.assignedTo?.email || null
    })
  } catch (error) {
    logger.error('Failed to fetch rating data:', error)
    return NextResponse.json({ error: 'Failed to fetch rating data' }, { status: 500 })
  }
}
