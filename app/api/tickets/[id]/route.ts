import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticketId = params.id

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true }
        },
        assignedTo: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            phone: true,
            contractorProfile: {
              select: {
                id: true,
                specialties: true,
                rating: true
              }
            }
          }
        },
        admin: {
          select: { id: true, name: true, email: true }
        },
        asset: {
          select: {
            id: true,
            name: true,
            assetNumber: true,
            location: true
          }
        },
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            mimeType: true,
            size: true,
            createdAt: true
          }
        },
        messages: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { messages: true }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check access permissions
    const user = session.user
    const isOwner = ticket.userId === user.id
    const isAssignedContractor = ticket.assignedToId === user.id
    const isAdmin = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN', 'SUPER_ADMIN'].includes(user.role)
    const isSameTenant = ticket.tenantId === user.tenantId

    if (!isOwner && !isAssignedContractor && !(isAdmin && isSameTenant)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    logger.error('Error fetching ticket:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}
