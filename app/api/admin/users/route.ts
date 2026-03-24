import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { sendUserActivationEmail } from '@/lib/email'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schema for creating users (NO PASSWORD - user sets it via activation)
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  phone: z.string().min(10, 'Phone number required').max(20),
  role: z.enum(['END_USER', 'TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']),
  branchIds: z.array(z.string().cuid()).min(1, 'At least one branch must be selected'),
})

// Get all users for tenant
export async function GET() {
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

    if (!tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Fetch all non-contractor users for this tenant
    const users = await prisma.user.findMany({
      where: {
        tenantId: tenantId,
        role: {
          not: 'CONTRACTOR'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
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
      return NextResponse.json({ error: 'Only tenant admins can create users' }, { status: 403 })
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Validate request body with Zod schema
    const body = await request.json()
    const parseResult = createUserSchema.safeParse(body)
    
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { name, email, role: newUserRole, branchIds, phone } = parseResult.data

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

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
    const isAdminRole = newUserRole.includes('ADMIN')
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

    // Generate activation token (user will set their own password)
    const activationToken = crypto.randomBytes(32).toString('hex')
    const activationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    // Create user with branch assignments (NO password - pending activation)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: '', // Empty - user will set via activation
        role: newUserRole as any,
        tenantId: tenantId,
        isActive: false, // Not active until they set password
        status: 'APPROVED_EMAIL_PENDING',
        activationToken,
        activationExpires,
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
      where: { id: tenantId },
      select: { name: true }
    })

    // Get branch names for email
    const branchNames = newUser.branches.map(ub => ub.branch.name)

    // Generate activation link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const activationLink = `${baseUrl}/auth/activate-account/${activationToken}`

    // Send activation email (user will set their own password)
    sendUserActivationEmail(
      email,
      name,
      tenant?.name || 'TickTrack Pro',
      branchNames,
      activationLink
    ).catch(err => console.error('Failed to send activation email:', err))

    return NextResponse.json({ 
      user: newUser,
      message: 'User created. Activation email sent.'
    })
  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
