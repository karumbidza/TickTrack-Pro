import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // For tenant admins, only show invoices from their tenant
    const whereCondition = session.user.role === 'TENANT_ADMIN' 
      ? { tenantId: session.user.tenantId }
      : {} // Super admin can see all

    const invoices = await prisma.invoice.findMany({
      where: whereCondition,
      include: {
        contractor: {
          select: {
            name: true,
            email: true,
          }
        },
        ticket: {
          select: {
            title: true,
            id: true,
            ticketNumber: true,
          }
        },
        paymentBatch: {
          select: {
            id: true,
            batchNumber: true,
            popFileUrl: true,
            popReference: true,
            paymentDate: true,
            totalAmount: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Error fetching admin invoices:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}