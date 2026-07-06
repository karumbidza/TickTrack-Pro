import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoiceSummaryPDF } from '@/lib/pdf-generator'

const ADMIN_ROLES = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const isAdmin = ADMIN_ROLES.includes(ctx.role)
    const isContractor = ctx.role === 'CONTRACTOR'
    if (!isAdmin && !isContractor && !ctx.isSuperAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const invoiceId = params.id

    // Tenant isolation: SUPER_ADMIN may cross tenants; admins are pinned to their
    // tenant; contractors may only fetch their own invoices. A null tenantId must
    // never collapse the filter, so we fall back to a sentinel that matches nothing.
    const tenantScope = ctx.isSuperAdmin ? {} : { tenantId: ctx.tenantId ?? '__none__' }
    const ownershipScope = isContractor && !ctx.isSuperAdmin ? { contractorId: ctx.userId } : {}

    // Fetch invoice with all related data
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, ...tenantScope, ...ownershipScope },
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
            branch: {
              select: {
                name: true
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
                    bio: true,
                    contractorCategories: {
                      include: {
                        category: {
                          select: {
                            name: true
                          }
                        }
                      }
                    }
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
                bio: true,
                contractorCategories: {
                  include: {
                    category: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
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

    // Get contractor categories
    const contractorCategories = invoice.contractor?.contractorProfile?.contractorCategories?.map(
      cc => cc.category.name
    ) || ticket.assignedTo?.contractorProfile?.contractorCategories?.map(
      cc => cc.category.name
    ) || []

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
      ticketType: String(ticket.type) || 'General',
      ticketPriority: String(ticket.priority),
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
      
      // Branch info
      branch: ticket.branch ? {
        name: ticket.branch.name
      } : undefined,
      
      // Asset details
      asset: ticket.asset ? {
        name: ticket.asset.name,
        assetNumber: ticket.asset.assetNumber,
        location: ticket.asset.location || 'N/A',
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
        categories: contractorCategories.length > 0 ? contractorCategories : undefined
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
        'Content-Disposition': `attachment; filename="Ticket-Summary-${ticket.ticketNumber || invoice.invoiceNumber}.pdf"`,
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
