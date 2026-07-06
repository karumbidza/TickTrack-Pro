import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { requireTenantResource } from '@/lib/tenant-guard'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: ticketId } = await params

    // Tenant-scoped lookup (fails closed; SUPER_ADMIN may cross tenants).
    const ticket = await requireTenantResource(prisma.ticket, ticketId, authCtx, {
      select: {
        id: true,
        userId: true,
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

    // End users may only read rating data for their own ticket.
    if (authCtx.isEndUser && ticket.userId !== authCtx.userId) {
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
