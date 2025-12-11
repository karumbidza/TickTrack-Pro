import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get a single branch
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    const branch = await prisma.branch.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenant.id
      },
      include: {
        userBranches: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    return NextResponse.json({ branch })
  } catch (error) {
    console.error('Error fetching branch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a branch
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'TENANT_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    const data = await request.json()

    // Check if branch exists and belongs to tenant
    const existingBranch = await prisma.branch.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenant.id
      }
    })

    if (!existingBranch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Check for duplicate name (if name is being changed)
    if (data.name && data.name.trim() !== existingBranch.name) {
      const duplicate = await prisma.branch.findFirst({
        where: {
          tenantId: user.tenant.id,
          name: data.name.trim(),
          id: { not: params.id }
        }
      })
      if (duplicate) {
        return NextResponse.json({ error: 'A branch with this name already exists' }, { status: 400 })
      }
    }

    // If setting as head office, check if another HQ exists
    if (data.isHeadOffice && !existingBranch.isHeadOffice) {
      const existingHQ = await prisma.branch.findFirst({
        where: {
          tenantId: user.tenant.id,
          isHeadOffice: true,
          id: { not: params.id }
        }
      })
      if (existingHQ) {
        return NextResponse.json({ error: 'A head office already exists. Remove the existing head office first.' }, { status: 400 })
      }
    }

    const branch = await prisma.branch.update({
      where: { id: params.id },
      data: {
        name: data.name?.trim() || existingBranch.name,
        address: data.address?.trim() ?? existingBranch.address,
        type: data.isHeadOffice ? 'HEAD_OFFICE' : (data.type || existingBranch.type),
        isHeadOffice: data.isHeadOffice ?? existingBranch.isHeadOffice,
        isActive: data.isActive ?? existingBranch.isActive
      }
    })

    return NextResponse.json({ branch })
  } catch (error) {
    console.error('Error updating branch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a branch
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'TENANT_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    // Check if branch exists and belongs to tenant
    const branch = await prisma.branch.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenant.id
      },
      include: {
        _count: {
          select: {
            userBranches: true
          }
        }
      }
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Check if branch has users assigned
    if (branch._count.userBranches > 0) {
      return NextResponse.json({ 
        error: `Cannot delete branch with ${branch._count.userBranches} assigned user(s). Remove users first.` 
      }, { status: 400 })
    }

    // Soft delete (set isActive to false) or hard delete
    await prisma.branch.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: 'Branch deleted successfully' })
  } catch (error) {
    console.error('Error deleting branch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
