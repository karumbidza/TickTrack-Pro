import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/lib/email'

// Get all users for tenant
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Fetch all non-contractor users for this tenant
    const users = await prisma.user.findMany({
      where: {
        tenantId: session.user.tenantId,
        role: {
          not: 'CONTRACTOR'
        }
      },
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
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN']
    
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Only tenant admins can create users' }, { status: 403 })
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    const { name, email, password, role, branchIds, phone } = await request.json()

    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'Name, email, phone, and password are required' }, { status: 400 })
    }

    if (!branchIds || !Array.isArray(branchIds) || branchIds.length === 0) {
      return NextResponse.json({ error: 'At least one branch must be selected' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Valid roles that can be created
    const validRoles = ['END_USER', 'TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Verify all branches belong to the tenant
    const branches = await prisma.branch.findMany({
      where: {
        id: { in: branchIds },
        tenantId: session.user.tenantId
      }
    })

    if (branches.length !== branchIds.length) {
      return NextResponse.json({ error: 'Invalid branch selection' }, { status: 400 })
    }

    // Check if HQ branch is selected and user is admin - auto-assign all branches
    const isAdminRole = role.includes('ADMIN')
    const hqBranch = branches.find(b => b.isHeadOffice)
    let finalBranchIds = branchIds

    if (hqBranch && isAdminRole) {
      // Auto-assign all tenant branches
      const allBranches = await prisma.branch.findMany({
        where: {
          tenantId: session.user.tenantId,
          isActive: true
        },
        select: { id: true }
      })
      finalBranchIds = allBranches.map(b => b.id)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with branch assignments
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: role as any,
        tenantId: session.user.tenantId,
        isActive: true,
        branches: {
          create: finalBranchIds.map(branchId => ({
            branchId
          }))
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
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

    // Get tenant name for email
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true }
    })

    // Get branch names for email
    const branchNames = newUser.branches.map(ub => ub.branch.name)

    // Send welcome email with credentials (non-blocking)
    sendWelcomeEmail(
      email,
      name,
      password, // Original password before hashing
      tenant?.name || 'TickTrack Pro',
      branchNames
    ).catch(err => console.error('Failed to send welcome email:', err))

    return NextResponse.json({ user: newUser })
  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
