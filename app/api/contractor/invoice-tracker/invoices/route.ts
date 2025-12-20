import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// GET - Fetch all invoices for the contractor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'CONTRACTOR') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get all invoices for this contractor (only active ones by default)
    const invoices = await prisma.invoice.findMany({
      where: {
        contractorId: session.user.id,
        isActive: true  // Only show active invoices
      },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            tenant: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate stats
    const stats = {
      totalInvoices: invoices.length,
      pendingInvoices: invoices.filter(i => i.status === 'PENDING').length,
      approvedInvoices: invoices.filter(i => i.status === 'APPROVED').length,
      paidInvoices: invoices.filter(i => i.status === 'PAID').length,
      totalEarnings: invoices
        .filter(i => i.status === 'PAID')
        .reduce((sum, i) => sum + i.paidAmount, 0),
      pendingAmount: invoices
        .filter(i => ['PENDING', 'APPROVED'].includes(i.status))
        .reduce((sum, i) => sum + i.amount, 0)
    }

    return NextResponse.json({ invoices, stats })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'CONTRACTOR') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    
    const ticketId = formData.get('ticketId') as string
    const invoiceNumber = formData.get('invoiceNumber') as string
    const amount = parseFloat(formData.get('amount') as string)
    const hoursWorked = formData.get('hoursWorked') as string
    const hourlyRate = formData.get('hourlyRate') as string
    const workDescription = formData.get('workDescription') as string
    const invoiceFile = formData.get('invoiceFile') as File | null

    if (!ticketId || !invoiceNumber || !amount || !workDescription) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the ticket exists and is assigned to this contractor
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        assignedToId: session.user.id,
        status: 'COMPLETED'
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { message: 'Ticket not found or not eligible for invoicing' },
        { status: 404 }
      )
    }

    // Check if an active invoice already exists for this ticket
    const existingInvoice = await prisma.invoice.findFirst({
      where: { 
        ticketId,
        isActive: true
      }
    })

    // Allow resubmission only if the existing invoice was REJECTED
    if (existingInvoice && existingInvoice.status !== 'REJECTED') {
      return NextResponse.json(
        { message: 'An active invoice already exists for this ticket' },
        { status: 409 }
      )
    }

    // If resubmitting, deactivate the old rejected invoice
    let revisionNumber = 1
    let previousInvoiceId: string | undefined = undefined
    
    if (existingInvoice && existingInvoice.status === 'REJECTED') {
      await prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: { isActive: false }
      })
      revisionNumber = (existingInvoice.revisionNumber || 1) + 1
      previousInvoiceId = existingInvoice.id
    }

    // Handle file upload
    let invoiceFileUrl: string | null = null
    if (invoiceFile && invoiceFile.size > 0) {
      const bytes = await invoiceFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices')
      await mkdir(uploadDir, { recursive: true })
      
      const ext = path.extname(invoiceFile.name)
      const filename = `${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}${ext}`
      const filePath = path.join(uploadDir, filename)
      
      await writeFile(filePath, buffer)
      invoiceFileUrl = `/uploads/invoices/${filename}`
    }

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        contractorId: session.user.id,
        ticketId,
        tenantId: ticket.tenantId,
        invoiceNumber,
        amount,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        workDescription,
        invoiceFileUrl,
        status: 'PENDING',
        balance: amount,
        isActive: true,
        revisionNumber,
        previousInvoiceId
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
    })

    // Create notification for admin
    const admins = await prisma.user.findMany({
      where: {
        tenantId: ticket.tenantId,
        role: {
          in: ['TENANT_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
        },
        isActive: true
      },
      select: { id: true }
    })

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'INVOICE_SUBMITTED',
          title: 'New Invoice Submitted',
          message: `Invoice ${invoiceNumber} submitted for ticket ${ticket.ticketNumber}`,
          data: JSON.stringify({
            invoiceId: invoice.id,
            ticketId: ticket.id,
            amount
          })
        }))
      })
    }

    return NextResponse.json({ 
      message: 'Invoice created successfully',
      invoice 
    })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
