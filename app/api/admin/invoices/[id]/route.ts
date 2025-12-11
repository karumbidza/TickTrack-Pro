import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch single invoice details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    const adminRoles = ['TENANT_ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!session?.user || !adminRoles.includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const invoiceId = params.id

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            contractorProfile: {
              select: {
                specialties: true,
                hourlyRate: true,
                rating: true,
                totalJobs: true,
              }
            }
          }
        },
        ticket: {
          select: {
            id: true,
            title: true,
            ticketNumber: true,
            description: true,
            type: true,
            priority: true,
            status: true,
            location: true,
            createdAt: true,
            completedAt: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            },
            asset: {
              select: {
                name: true,
                assetNumber: true,
                location: true,
              }
            }
          }
        },
        tenant: {
          select: {
            name: true,
            domain: true,
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 })
    }

    // For tenant admins, ensure they can only view their tenant's invoices
    if (session.user.role === 'TENANT_ADMIN' && invoice.tenantId !== session.user.tenantId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    const adminRoles = ['TENANT_ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!session?.user || !adminRoles.includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, rejectionReason, clarificationRequest } = body
    const invoiceId = params.id

    // Find the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        amount: true,
        contractorId: true
      }
    })

    if (!invoice) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 })
    }

    // For tenant admins, ensure they can only modify their tenant's invoices
    if (session.user.role === 'TENANT_ADMIN' && invoice.tenantId !== session.user.tenantId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    
    if (status) {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'PROCESSING']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ message: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
    }
    
    if (rejectionReason !== undefined) {
      updateData.rejectionReason = rejectionReason
    }
    
    if (clarificationRequest !== undefined) {
      updateData.clarificationRequest = clarificationRequest
      // When requesting clarification, set status to PROCESSING if not already
      if (!status && invoice.status === 'PENDING') {
        updateData.status = 'PENDING' // Keep as pending but with clarification request
      }
    }

    // Update the invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData
    })

    // Create notification for contractor
    if (invoice.contractorId) {
      let notificationTitle = ''
      let notificationMessage = ''
      
      if (status === 'APPROVED') {
        notificationTitle = 'Invoice Approved'
        notificationMessage = `Your invoice has been approved for payment.`
      } else if (status === 'REJECTED') {
        notificationTitle = 'Invoice Rejected'
        notificationMessage = `Your invoice has been rejected. Reason: ${rejectionReason || 'Not specified'}`
      } else if (clarificationRequest) {
        notificationTitle = 'Clarification Requested'
        notificationMessage = `Admin has requested clarification on your invoice: ${clarificationRequest}`
      }
      
      if (notificationTitle) {
        await prisma.notification.create({
          data: {
            userId: invoice.contractorId,
            type: 'INVOICE_UPDATE',
            title: notificationTitle,
            message: notificationMessage,
            data: { invoiceId: invoice.id }
          }
        })
      }
    }

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}