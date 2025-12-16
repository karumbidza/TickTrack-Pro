import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Get contractor details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contractorId = params.id

    const contractor = await prisma.user.findUnique({
      where: { id: contractorId },
      include: {
        contractorProfile: true
      }
    })

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    return NextResponse.json({ contractor })
  } catch (error) {
    console.error('Failed to fetch contractor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update contractor
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contractorId = params.id
    const { name, email, phone, secondaryPhone, isActive } = await request.json()

    // Find the contractor user
    const contractor = await prisma.user.findUnique({
      where: { id: contractorId },
      include: {
        contractorProfile: true
      }
    })

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // Ensure contractor belongs to same tenant (unless super admin)
    if (contractor.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update user record
    const updatedUser = await prisma.user.update({
      where: { id: contractorId },
      data: {
        name: name || contractor.name,
        email: email || contractor.email,
        phone: phone !== undefined ? phone : contractor.phone,
        isActive: isActive !== undefined ? isActive : contractor.isActive
      }
    })

    // Update contractor profile if exists
    if (contractor.contractorProfile) {
      await prisma.contractor.update({
        where: { id: contractor.contractorProfile.id },
        data: {
          secondaryPhone: secondaryPhone !== undefined ? secondaryPhone : contractor.contractorProfile.secondaryPhone
        }
      })
    }

    return NextResponse.json({ success: true, contractor: updatedUser })
  } catch (error) {
    console.error('Failed to update contractor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete contractor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN']
    
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Only tenant admins can delete contractors' }, { status: 403 })
    }

    const contractorId = params.id

    // Find the contractor user
    const contractor = await prisma.user.findUnique({
      where: { id: contractorId }
    })

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // Ensure contractor belongs to same tenant
    if (contractor.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for active assignments
    const activeAssignments = await prisma.ticket.count({
      where: {
        assignedToId: contractorId,
        status: {
          in: ['OPEN', 'PROCESSING', 'ACCEPTED', 'IN_PROGRESS', 'ON_SITE', 'AWAITING_APPROVAL']
        }
      }
    })

    if (activeAssignments > 0) {
      return NextResponse.json({ 
        error: `Cannot delete contractor with ${activeAssignments} active assignment(s). Reassign or complete tickets first.` 
      }, { status: 400 })
    }

    // Deactivate instead of hard delete
    await prisma.user.update({
      where: { id: contractorId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true, message: 'Contractor deactivated successfully' })
  } catch (error) {
    console.error('Failed to delete contractor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
