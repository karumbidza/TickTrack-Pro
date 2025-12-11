import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
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

    const { status, priority, notes } = await request.json()
    const ticketId = params.id

    // Ensure user has tenantId
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Verify ticket belongs to user's tenant
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        tenantId: user.tenantId
      }
    })

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Update ticket
    const updateData: any = {}
    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    updateData.updatedAt = new Date()

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
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
            email: true
          }
        },
        asset: true
      }
    })

    // Add update message if notes provided
    if (notes) {
      await prisma.message.create({
        data: {
          content: `Ticket updated by admin. Notes: ${notes}`,
          ticketId,
          userId: user.id
        }
      })
    }

    return NextResponse.json({ ticket: updatedTicket }, { status: 200 })
  } catch (error) {
    console.error('Failed to update ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}