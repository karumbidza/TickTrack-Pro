import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assets = await prisma.asset.findMany({
      where: {
        tenant: {
          users: {
            some: {
              email: session.user.email
            }
          }
        }
      },
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Map to include categoryId and category name for easy access
    const mappedAssets = assets.map(asset => ({
      ...asset,
      categoryId: asset.categoryId,
      category: asset.category?.name || 'Uncategorized'
    }))

    return NextResponse.json({ assets: mappedAssets })
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