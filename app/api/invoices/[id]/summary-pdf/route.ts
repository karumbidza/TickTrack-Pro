import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoiceSummaryPDF } from '@/lib/pdf-generator'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const invoiceId = params.id

    // Fetch invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        ticket: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            },
            assignedTo: {
              select: {
                name: true,
                email: true,
                phone: true,
                contractorProfile: {
                  select: {
                    specialties: true,
                    bio: true
                  }
                }
              }
            },
            asset: {
              select: {
                name: true,
                assetNumber: true,
                location: true,
                brand: true,
                model: true,
                serialNumber: true
              }
            },
            tenant: {
              select: {
                name: true
              }
            }
          }
        },
        contractor: {
          select: {
            name: true,
            email: true,
            phone: true,
            contractorProfile: {
              select: {
                specialties: true,
                bio: true
              }
            }
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 })
    }

    const ticket = invoice.ticket

    // Format dates and times
    const formatDate = (date: Date | null) => {
      if (!date) return null
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    const formatTime = (date: Date | null) => {
      if (!date) return null
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Prepare data for PDF
    const pdfData = {
      // Invoice details
      invoiceNumber: invoice.invoiceNumber,
      invoiceAmount: invoice.amount,
      invoiceDate: formatDate(invoice.createdAt) || '',
      
      // Ticket details
      ticketNumber: ticket.ticketNumber || 'N/A',
      ticketTitle: ticket.title,
      ticketDescription: ticket.description || '',
      ticketType: ticket.type || 'General',
      ticketPriority: ticket.priority,
      dateRaised: formatDate(ticket.createdAt) || '',
      timeRaised: formatTime(ticket.createdAt) || '',
      dateClosed: formatDate(ticket.completedAt),
      timeClosed: formatTime(ticket.completedAt),
      
      // Requester details
      raisedBy: {
        name: ticket.user.name || 'Unknown',
        email: ticket.user.email,
        phone: ticket.user.phone || undefined
      },
      
      // Asset details
      asset: ticket.asset ? {
        name: ticket.asset.name,
        assetNumber: ticket.asset.assetNumber,
        location: ticket.asset.location,
        brand: ticket.asset.brand || undefined,
        model: ticket.asset.model || undefined,
        serialNumber: ticket.asset.serialNumber || undefined
      } : undefined,
      
      // Contractor details - use bio as company/description since there's no companyName field
      contractor: {
        name: invoice.contractor?.name || ticket.assignedTo?.name || 'Unknown',
        email: invoice.contractor?.email || ticket.assignedTo?.email || '',
        phone: invoice.contractor?.phone || ticket.assignedTo?.phone || undefined,
        company: invoice.contractor?.contractorProfile?.bio || 
                 ticket.assignedTo?.contractorProfile?.bio || undefined,
        specialties: invoice.contractor?.contractorProfile?.specialties || 
                     ticket.assignedTo?.contractorProfile?.specialties || undefined
      },
      
      // Work description
      workDescription: invoice.workDescription || ticket.workDescription || 'No work description provided',
      workDescriptionApprovedAt: formatDate(ticket.workDescriptionApprovedAt),
      
      // Company
      tenantName: ticket.tenant.name
    }

    // Generate PDF
    const pdfBuffer = generateInvoiceSummaryPDF(pdfData)

    // Return PDF as response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-Summary-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Error generating invoice summary PDF:', error)
    return NextResponse.json(
      { message: 'Failed to generate invoice summary' },
      { status: 500 }
    )
  }
}
