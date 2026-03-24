import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch completed tickets for the contractor that don't have invoices yet
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId, sessionClaims } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
    const userId = meta.dbUserId ?? clerkUserId
    const tenantId = meta.tenantId ?? null
    const role = (meta.role as string) ?? 'END_USER'

    if (role !== 'CONTRACTOR') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get completed tickets assigned to this contractor
    const tickets = await prisma.ticket.findMany({
      where: {
        assignedToId: userId,
        status: 'COMPLETED'
      },
      include: {
        tenant: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        },
        invoices: {
          where: { isActive: true },
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true
          },
          take: 1
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error fetching completed tickets:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
