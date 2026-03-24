import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch payment batches for a contractor
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

    const contractorId = userId

    // Find all payment batches that contain invoices for this contractor
    const paymentBatches = await prisma.paymentBatch.findMany({
      where: {
        invoices: {
          some: {
            contractorId: contractorId
          }
        }
      },
      include: {
        invoices: {
          where: {
            contractorId: contractorId
          },
          include: {
            ticket: {
              select: {
                ticketNumber: true,
                title: true,
                tenant: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    })

    // Calculate the contractor's portion of each batch
    const formattedBatches = paymentBatches.map(batch => ({
      id: batch.id,
      batchNumber: batch.batchNumber,
      totalAmount: batch.invoices.reduce((sum, inv) => sum + inv.amount, 0), // Contractor's total from this batch
      popFileUrl: batch.popFileUrl,
      popReference: batch.popReference,
      paymentDate: batch.paymentDate.toISOString(),
      notes: batch.notes,
      invoices: batch.invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        ticket: inv.ticket
      }))
    }))

    return NextResponse.json({ batches: formattedBatches })
  } catch (error) {
    console.error('Error fetching payment batches:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
