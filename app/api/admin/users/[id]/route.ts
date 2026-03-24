import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkUserId, sessionClaims } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
    const userId = meta.dbUserId ?? clerkUserId
    const tenantId = meta.tenantId ?? null
    const role = (meta.role as string) ?? 'END_USER'

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']

    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetUserId = params.id

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        phone: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkUserId, sessionClaims } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
    const userId = meta.dbUserId ?? clerkUserId
    const tenantId = meta.tenantId ?? null
    const role = (meta.role as string) ?? 'END_USER'

    const allowedRoles = ['TENANT_ADMIN']

    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Only tenant admins can update users' }, { status: 403 })
    }

    const targetUserId = params.id
    const { name, email, phone, role: newRole, isActive, branchIds } = await request.json()

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Ensure user belongs to same tenant
    if (user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent changing own role (prevent self-lockout)
    if (targetUserId === userId && newRole && newRole !== role) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (isActive !== undefined) updateData.isActive = isActive

    // Only allow valid roles
    if (newRole !== undefined) {
      const validRoles = ['END_USER', 'TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
      if (validRoles.includes(newRole)) {
        updateData.role = newRole
      }
    }

    // Handle branch assignments if provided
    if (branchIds && Array.isArray(branchIds) && branchIds.length > 0 && tenantId) {
      // Verify all branches belong to the tenant
      const branches = await prisma.branch.findMany({
        where: {
          id: { in: branchIds },
          tenantId: tenantId
        }
      })

      if (branches.length !== branchIds.length) {
        return NextResponse.json({ error: 'Invalid branch selection' }, { status: 400 })
      }

      // Check if HQ branch is selected and user is admin - auto-assign all branches
      const isAdminRole = (newRole || user.role).includes('ADMIN')
      const hqBranch = branches.find(b => b.isHeadOffice)
      let finalBranchIds = branchIds

      if (hqBranch && isAdminRole) {
        // Auto-assign all tenant branches
        const allBranches = await prisma.branch.findMany({
          where: {
            tenantId: tenantId,
            isActive: true
          },
          select: { id: true }
        })
        finalBranchIds = allBranches.map(b => b.id)
      }

      // Delete existing branch assignments and create new ones
      await prisma.userBranch.deleteMany({
        where: { userId: targetUserId }
      })

      await prisma.userBranch.createMany({
        data: finalBranchIds.map(branchId => ({
          userId: targetUserId,
          branchId
        }))
      })
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        phone: true,
        createdAt: true,
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                isHeadOffice: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
