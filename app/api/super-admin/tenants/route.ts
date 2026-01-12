import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimitCheck } from '@/lib/api-rate-limit'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  // Rate limit: 200 requests per minute for super admin
  const rateLimitResponse = await rateLimitCheck(request, 'superAdmin')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        subscription: true,
        _count: {
          select: {
            users: true,
            tickets: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedTenants = tenants.map(tenant => {
      // Calculate expiry information
      let expiryDate: Date | null = null
      let daysUntilExpiry: number | undefined
      
      if (tenant.subscription?.currentPeriodEnd) {
        expiryDate = tenant.subscription.currentPeriodEnd
      } else if (tenant.subscription?.trialEndsAt) {
        expiryDate = tenant.subscription.trialEndsAt
      } else if (tenant.trialEndsAt) {
        expiryDate = tenant.trialEndsAt
      }
      
      if (expiryDate) {
        const today = new Date()
        const diffTime = expiryDate.getTime() - today.getTime()
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      // Check onboarding completion (basic check)
      const onboardingComplete = tenant._count.users > 0 && tenant._count.tickets > 0

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        status: tenant.status,
        isActive: tenant.status === 'ACTIVE' || tenant.status === 'TRIAL',
        userCount: tenant._count.users,
        ticketCount: tenant._count.tickets,
        onboardingComplete,
        trialEndsAt: tenant.trialEndsAt,
        subscription: tenant.subscription ? {
          plan: tenant.subscription.plan,
          status: tenant.subscription.status,
          currentPeriodEnd: tenant.subscription.currentPeriodEnd,
          trialEndsAt: tenant.subscription.trialEndsAt,
          daysUntilExpiry
        } : null,
        features: tenant.features as Record<string, boolean>,
        createdAt: tenant.createdAt
      }
    })

    return NextResponse.json({ tenants: formattedTenants })
  } catch (error) {
    console.error('Super admin tenants fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      slug, 
      email, 
      phone, 
      address,
      adminName,
      adminEmail,
      adminPassword 
    } = body

    // Validate required fields
    if (!name || !slug || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Name, slug, admin email and password are required' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug }
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: 'A tenant with this slug already exists' },
        { status: 400 }
      )
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Create tenant with admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          email,
          phone,
          address,
          status: 'TRIAL',
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
          features: {
            ticketManagement: true,
            assetManagement: true,
            contractorManagement: true,
            reporting: false,
            advancedAnalytics: false
          }
        }
      })

      // Hash the admin password
      const hashedPassword = await bcrypt.hash(adminPassword, 12)

      // Create the tenant admin user
      const adminUser = await tx.user.create({
        data: {
          name: adminName || name + ' Admin',
          email: adminEmail,
          password: hashedPassword,
          role: 'TENANT_ADMIN',
          tenantId: tenant.id
        }
      })

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      await tx.verificationToken.create({
        data: {
          identifier: adminEmail,
          token: verificationToken,
          expires
        }
      })

      return { tenant, adminUser, verificationToken }
    })

    // Send verification email (outside transaction)
    try {
      const verificationLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${result.verificationToken}`
      await sendVerificationEmail(adminEmail, adminName || name + ' Admin', verificationLink)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Don't fail the tenant creation if email fails
    }

    return NextResponse.json({
      message: 'Tenant created successfully. Verification email sent.',
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        status: result.tenant.status
      },
      admin: {
        id: result.adminUser.id,
        email: result.adminUser.email
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create tenant:', error)
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    )
  }
}