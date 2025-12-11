import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH - Toggle a specific feature for a tenant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { feature, enabled } = body

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature name is required' },
        { status: 400 }
      )
    }

    // Get current tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Update the specific feature
    const currentFeatures = (tenant.features as Record<string, boolean>) || {}
    const updatedFeatures = {
      ...currentFeatures,
      [feature]: enabled
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: { features: updatedFeatures }
    })

    return NextResponse.json({
      message: 'Feature updated successfully',
      features: updatedTenant.features
    })
  } catch (error) {
    console.error('Failed to update feature:', error)
    return NextResponse.json(
      { error: 'Failed to update feature' },
      { status: 500 }
    )
  }
}
