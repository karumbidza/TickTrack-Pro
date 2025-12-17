import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Create batch payment for multiple approved invoices
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const adminRoles = ['TENANT_ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!session?.user || !adminRoles.includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invoiceIds, popFileUrl, popReference, paymentDate, notes } = body

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ message: 'Invoice IDs are required' }, { status: 400 })
    }

    if (!popFileUrl) {
      return NextResponse.json({ message: 'Proof of Payment file is required' }, { status: 400 })
    }

    // Fetch all invoices to validate
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        status: 'APPROVED' // Only approved invoices can be paid
      },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        ticket: {
          select: {
            ticketNumber: true,
            title: true,
          }
        }
      }
    })

    if (invoices.length !== invoiceIds.length) {
      const foundIds = invoices.map(inv => inv.id)
      const missingIds = invoiceIds.filter((id: string) => !foundIds.includes(id))
      return NextResponse.json({ 
        message: `Some invoices are not approved or not found: ${missingIds.join(', ')}` 
      }, { status: 400 })
    }

    // All invoices must be from the same tenant
    const tenantIds = [...new Set(invoices.map(inv => inv.tenantId))]
    if (tenantIds.length > 1) {
      return NextResponse.json({ 
        message: 'All invoices must be from the same tenant' 
      }, { status: 400 })
    }

    const tenantId = tenantIds[0]

    // For tenant admins, ensure they can only modify their tenant's invoices
    if (session.user.role !== 'SUPER_ADMIN' && tenantId !== session.user.tenantId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Calculate total amount
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)

    // Generate batch number
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const existingBatches = await prisma.paymentBatch.count({
      where: {
        batchNumber: {
          startsWith: `PB${dateStr}`
        }
      }
    })
    const batchNumber = `PB${dateStr}${String(existingBatches + 1).padStart(3, '0')}`

    // Create payment batch and update invoices in a transaction
    const paymentBatch = await prisma.$transaction(async (tx) => {
      // Create the payment batch
      const batch = await tx.paymentBatch.create({
        data: {
          batchNumber,
          tenantId: tenantId!,
          totalAmount,
          popFileUrl,
          popReference: popReference || null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes || null,
          processedById: session.user!.id,
        }
      })

      // Update all invoices to PAID and link to batch
      await tx.invoice.updateMany({
        where: {
          id: { in: invoiceIds }
        },
        data: {
          status: 'PAID',
          paymentBatchId: batch.id,
          paidDate: new Date(),
          paidAmount: 0, // Will update individually below
        }
      })

      // Update each invoice with its paid amount
      for (const invoice of invoices) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: invoice.amount,
            balance: 0,
          }
        })
      }

      // Create notifications for each contractor
      const contractorNotifications = invoices.reduce((acc, invoice) => {
        if (invoice.contractorId) {
          if (!acc[invoice.contractorId]) {
            acc[invoice.contractorId] = []
          }
          acc[invoice.contractorId].push(invoice)
        }
        return acc
      }, {} as Record<string, typeof invoices>)

      for (const [contractorId, contractorInvoices] of Object.entries(contractorNotifications)) {
        const ticketNumbers = contractorInvoices.map(inv => inv.ticket.ticketNumber).join(', ')
        const totalPaid = contractorInvoices.reduce((sum, inv) => sum + inv.amount, 0)
        
        await tx.notification.create({
          data: {
            userId: contractorId,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Received',
            message: `Payment of $${totalPaid.toFixed(2)} has been processed for tickets: ${ticketNumbers}. Batch reference: ${batchNumber}`,
            data: { 
              paymentBatchId: batch.id,
              invoiceIds: contractorInvoices.map(inv => inv.id),
              ticketNumbers,
              amount: totalPaid,
            }
          }
        })
      }

      return batch
    })

    // Fetch the complete batch with invoices for response
    const completeBatch = await prisma.paymentBatch.findUnique({
      where: { id: paymentBatch.id },
      include: {
        invoices: {
          include: {
            ticket: {
              select: {
                ticketNumber: true,
                title: true,
              }
            },
            contractor: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        processedBy: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json({
      message: `Payment batch created successfully. ${invoices.length} invoice(s) marked as paid.`,
      paymentBatch: completeBatch
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment batch:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Fetch all payment batches
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const adminRoles = ['TENANT_ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!session?.user || !adminRoles.includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const whereClause: Record<string, unknown> = {}
    
    // For tenant admins, filter by their tenant
    if (session.user.role !== 'SUPER_ADMIN') {
      whereClause.tenantId = session.user.tenantId
    }

    const paymentBatches = await prisma.paymentBatch.findMany({
      where: whereClause,
      include: {
        invoices: {
          include: {
            ticket: {
              select: {
                ticketNumber: true,
                title: true,
              }
            },
            contractor: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        processedBy: {
          select: {
            name: true,
            email: true,
          }
        },
        tenant: {
          select: {
            name: true,
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    })

    return NextResponse.json(paymentBatches)
  } catch (error) {
    console.error('Error fetching payment batches:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
