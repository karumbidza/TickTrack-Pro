import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const whereClause = {
      tenant: {
        users: {
          some: {
            email: session.user.email
          }
        }
      }
    }

    // Run count and data query in parallel
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where: whereClause,
        include: {
          category: true,
          tickets: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5
          },
          _count: {
            select: {
              tickets: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.asset.count({ where: whereClause })
    ])

    // Get repair costs for all assets in a single query using raw aggregation
    const assetIds = assets.map(a => a.id)
    
    const repairCosts = assetIds.length > 0 ? await prisma.invoice.groupBy({
      by: ['ticketId'],
      where: {
        status: 'PAID',
        ticket: {
          assetId: { in: assetIds },
          status: { in: ['COMPLETED', 'CLOSED'] }
        }
      },
      _sum: {
        amount: true
      }
    }) : []

    // Get ticket to asset mapping
    const ticketAssetMap = assetIds.length > 0 ? await prisma.ticket.findMany({
      where: {
        id: { in: repairCosts.map(rc => rc.ticketId) }
      },
      select: {
        id: true,
        assetId: true
      }
    }) : []

    // Create a map of assetId to total repair cost
    const assetCostMap = new Map<string, number>()
    repairCosts.forEach(rc => {
      const ticket = ticketAssetMap.find(t => t.id === rc.ticketId)
      if (ticket?.assetId) {
        const current = assetCostMap.get(ticket.assetId) || 0
        assetCostMap.set(ticket.assetId, current + (rc._sum.amount || 0))
      }
    })

    // Merge repair costs with assets
    const assetsWithCosts = assets.map(asset => ({
      ...asset,
      categoryId: asset.categoryId,
      category: asset.category,
      totalRepairCost: assetCostMap.get(asset.id) || 0
    }))

    return NextResponse.json({ 
      assets: assetsWithCosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and tenant info
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    const data = await request.json()

    // Generate asset number
    const assetCount = await prisma.asset.count({
      where: { tenantId: user.tenant.id }
    })
    const assetNumber = `AST${String(assetCount + 1).padStart(6, '0')}`

    const asset = await prisma.asset.create({
      data: {
        assetNumber,
        name: data.name,
        description: data.description,
        categoryId: data.category, // This is the category ID from the form
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        status: data.status || 'ACTIVE',
        location: data.location,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpires: data.warrantyExpires ? new Date(data.warrantyExpires) : null,
        purchasePrice: data.purchasePrice,
        images: data.images || [],
        manuals: data.manuals || [],
        specifications: data.specifications || {},
        tenantId: user.tenant.id
      },
      include: {
        category: true
      }
    })

    return NextResponse.json({ asset })
  } catch (error) {
    console.error('Error creating asset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { id, ...updateData } = data

    // Get user and tenant info
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    const asset = await prisma.asset.update({
      where: { 
        id,
        tenantId: user.tenant.id // Ensure user can only update assets in their tenant
      },
      data: {
        ...updateData,
        purchaseDate: updateData.purchaseDate ? new Date(updateData.purchaseDate) : undefined,
        warrantyExpires: updateData.warrantyExpires ? new Date(updateData.warrantyExpires) : undefined,
      }
    })

    return NextResponse.json({ asset })
  } catch (error) {
    console.error('Error updating asset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }

    // Get user and tenant info
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    await prisma.asset.delete({
      where: { 
        id,
        tenantId: user.tenant.id // Ensure user can only delete assets in their tenant
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting asset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}