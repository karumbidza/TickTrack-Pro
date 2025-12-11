import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(
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
    
    // Check content type for multipart form data
    const contentType = request.headers.get('content-type') || ''
    
    let amount: number
    let notes: string | null = null
    let proofOfPaymentUrl: string | null = null
    let paymentMethod: string | null = null
    let paymentReference: string | null = null
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with file upload)
      const formData = await request.formData()
      amount = parseFloat(formData.get('amount') as string)
      notes = formData.get('notes') as string
      paymentMethod = formData.get('paymentMethod') as string
      paymentReference = formData.get('paymentReference') as string
      const popFile = formData.get('popFile') as File | null
      
      // Handle POP file upload
      if (popFile && popFile.size > 0) {
        const bytes = await popFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pop')
        await mkdir(uploadDir, { recursive: true })
        
        const ext = path.extname(popFile.name)
        const filename = `POP-${invoiceId}-${Date.now()}${ext}`
        const filePath = path.join(uploadDir, filename)
        
        await writeFile(filePath, buffer)
        proofOfPaymentUrl = `/uploads/pop/${filename}`
      }
    } else {
      // Handle JSON
      const body = await request.json()
      amount = body.amount
      notes = body.notes
      proofOfPaymentUrl = body.proofOfPaymentUrl
    }

    // Validate payment amount
    if (!amount || amount <= 0) {
      return NextResponse.json({ message: 'Invalid payment amount' }, { status: 400 })
    }

    // Find the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        tenantId: true,
        status: true,
        amount: true,
        paidAmount: true,
        balance: true,
        paidDate: true,
        notes: true,
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

    // Check if invoice is approved for payment
    if (invoice.status !== 'APPROVED') {
      return NextResponse.json({ 
        message: 'Invoice must be approved before payment' 
      }, { status: 400 })
    }

    // Validate payment amount doesn't exceed balance
    if (amount > invoice.balance) {
      return NextResponse.json({ 
        message: 'Payment amount exceeds invoice balance' 
      }, { status: 400 })
    }

    // Calculate new amounts
    const newPaidAmount = invoice.paidAmount + amount
    const newBalance = invoice.amount - newPaidAmount
    const isPaidInFull = newBalance <= 0

    // Update the invoice with payment information
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        balance: newBalance,
        status: isPaidInFull ? 'PAID' : 'APPROVED',
        paidDate: isPaidInFull ? new Date() : invoice.paidDate,
        proofOfPaymentUrl,
        notes: notes ? `${invoice.notes ? invoice.notes + '\n' : ''}Payment: ${notes}` : invoice.notes
      },
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
          }
        }
      }
    })

    // Notify contractor of payment
    if (invoice.contractorId && isPaidInFull) {
      await prisma.notification.create({
        data: {
          userId: invoice.contractorId,
          type: 'INVOICE_PAID',
          title: '💰 Payment Received!',
          message: `Your invoice ${invoice.invoiceNumber} has been paid. Amount: $${amount.toLocaleString()}${proofOfPaymentUrl ? '. Proof of payment is available in Invoice Tracker.' : ''}`,
          data: JSON.stringify({
            invoiceId: invoice.id,
            amount,
            proofOfPaymentUrl
          })
        }
      })
    }

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}