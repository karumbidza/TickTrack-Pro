import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'CONTRACTOR') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const whereClause = {
      assignedToId: session.user.id,
    }

    // Run count and data query in parallel
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: whereClause,
        include: {
          tenant: {
            select: {
              name: true
            }
          },
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          },
          asset: {
            select: {
              id: true,
              name: true,
              assetNumber: true,
              location: true,
              brand: true,
              model: true,
              serialNumber: true,
              status: true,
              images: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  icon: true
                }
              },
              // Get repair history - tickets for this asset
              tickets: {
                select: {
                  id: true,
                  ticketNumber: true,
                  title: true,
                  status: true,
                  type: true,
                  priority: true,
                  description: true,
                  workDescription: true,
                  workDescriptionApproved: true,
                  createdAt: true,
                  completedAt: true,
                  assignedTo: {
                    select: {
                      id: true,
                      name: true
                    }
                  },
                  invoice: {
                    select: {
                      amount: true,
                      status: true
                    }
                  }
                },
                orderBy: {
                  createdAt: 'desc'
                },
                take: 10
              }
            }
          },
          attachments: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              url: true,
              mimeType: true
            }
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              amount: true,
              status: true,
              invoiceFileUrl: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.ticket.count({ where: whereClause })
    ])

    // Transform tickets to match Job interface
    const jobs = tickets.map(ticket => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status === 'PROCESSING' ? 'PROCESSING' : ticket.status,
      priority: ticket.priority,
      type: ticket.type || 'OTHER',
      location: ticket.location || ticket.asset?.location || 'Remote',
      estimatedHours: ticket.estimatedHours || 8,
      hourlyRate: 75,
      scheduledDate: ticket.dueDate?.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
      // Work description workflow fields
      workDescriptionRequestedAt: ticket.workDescriptionRequestedAt?.toISOString() || null,
      workDescription: ticket.workDescription || null,
      workDescriptionSubmittedAt: ticket.workDescriptionSubmittedAt?.toISOString() || null,
      workDescriptionApproved: ticket.workDescriptionApproved || false,
      workDescriptionApprovedAt: ticket.workDescriptionApprovedAt?.toISOString() || null,
      workDescriptionRejectionReason: ticket.workDescriptionRejectionReason || null,
      // SLA tracking fields
      assignedAt: ticket.assignedAt?.toISOString() || null,
      contractorAcceptedAt: ticket.contractorAcceptedAt?.toISOString() || null,
      onSiteAt: ticket.onSiteAt?.toISOString() || null,
      completedAt: ticket.completedAt?.toISOString() || null,
      responseDeadline: ticket.responseDeadline?.toISOString() || null,
      resolutionDeadline: ticket.resolutionDeadline?.toISOString() || null,
      tenant: {
        name: ticket.tenant.name
      },
      user: {
        name: ticket.user.name || 'Unknown',
        email: ticket.user.email
      },
      asset: ticket.asset ? {
        id: ticket.asset.id,
        name: ticket.asset.name,
        assetNumber: ticket.asset.assetNumber,
        location: ticket.asset.location,
        brand: ticket.asset.brand,
        model: ticket.asset.model,
        serialNumber: ticket.asset.serialNumber,
        status: ticket.asset.status,
        images: ticket.asset.images || [],
        category: ticket.asset.category ? {
          id: ticket.asset.category.id,
          name: ticket.asset.category.name,
          color: ticket.asset.category.color,
          icon: ticket.asset.category.icon
        } : null,
        // Repair history - past tickets on this asset
        repairHistory: (ticket.asset.tickets || [])
          .filter(t => t.id !== ticket.id) // Exclude current ticket
          .map(t => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            title: t.title,
            description: t.description,
            status: t.status,
            type: t.type,
            priority: t.priority,
            workDescription: t.workDescriptionApproved ? t.workDescription : null, // Only show approved work descriptions
            contractorName: t.assignedTo?.name || null,
            createdAt: t.createdAt.toISOString(),
            completedAt: t.completedAt?.toISOString() || null
          }))
      } : null,
      attachments: ticket.attachments || [],
      invoice: ticket.invoice ? {
        id: ticket.invoice.id,
        invoiceNumber: ticket.invoice.invoiceNumber,
        amount: ticket.invoice.amount,
        status: ticket.invoice.status,
        invoiceFileUrl: ticket.invoice.invoiceFileUrl
      } : null
    }))

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching contractor jobs:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}