import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'
import { sendVerificationEmail, sendTrialStartedEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      industry,
      companySize,
      adminName,
      adminEmail,
      adminPhone,
      customRequirements
    } = body

    // Validate required fields (NO password - user sets via activation email)
    if (!companyName || !companyEmail || !adminName || !adminEmail || !companySize) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate tenant slug from company name
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug }
    })

    if (existingTenant) {
      return NextResponse.json(
        { message: 'Company name already taken. Please choose a different name.' },
        { status: 409 }
      )
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    // Create tenant and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug,
          email: companyEmail,
          phone: companyPhone || null,
          address: companyAddress || null,
          status: 'TRIAL',
          trialEndsAt,
          settings: {
            industry: industry || null,
            companySize,
            customRequirements: customRequirements || null,
            onboardingCompleted: false
          }
        }
      })

      // Create admin user with activation token (NO password - user sets via email)
      const activationToken = randomBytes(32).toString('hex')
      const activationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
      
      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: '', // Empty - user sets password via activation email
          phone: adminPhone || null,
          role: 'TENANT_ADMIN',
          tenantId: tenant.id,
          status: 'APPROVED_EMAIL_PENDING',
          isActive: false, // Not active until password is set
          emailVerified: null,
          activationToken,
          activationExpires
        }
      })

      // Create trial subscription
      const subscription = await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: 'BASIC', // Start with basic during trial
          status: 'TRIAL',
          amount: 0, // Free during trial
          trialEndsAt,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndsAt
        }
      })

      return { tenant, adminUser, subscription }
    })

    // Send verification email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const verificationLink = `${baseUrl}/auth/activate-account/${result.adminUser.activationToken}`
    
    try {
      await sendVerificationEmail(
        result.adminUser.email,
        result.adminUser.name || 'Admin',
        verificationLink
      )
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError)
      // Don't fail the registration if email sending fails
    }

    // Send trial started email with payment reminder
    try {
      await sendTrialStartedEmail(
        result.adminUser.email,
        result.adminUser.name || 'Admin',
        companyName,
        trialEndsAt,
        body.selectedPlan || 'PRO'
      )
    } catch (emailError) {
      logger.error('Failed to send trial started email:', emailError)
    }

    // Log successful registration
    logger.info(`New tenant registered: ${companyName} (${slug}) by ${adminEmail}`)

    return NextResponse.json({
      message: 'Registration successful',
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        trialEndsAt: result.tenant.trialEndsAt
      },
      adminUser: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name
      }
    }, { status: 201 })

  } catch (error: any) {
    logger.error('Tenant registration error:', error)
    
    // Handle specific Prisma errors
    if (error?.code === 'P2002') {
      const target = error?.meta?.target || []
      
      if (target.includes('email')) {
        return NextResponse.json(
          { 
            error: 'account_exists',
            message: 'An account with this email already exists',
            field: 'email'
          },
          { status: 409 }
        )
      }
      
      if (target.includes('slug')) {
        return NextResponse.json(
          { 
            error: 'company_exists',
            message: 'A company with this name already exists. Please choose a different name.',
            field: 'companyName'
          },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'duplicate',
          message: 'Company name or email already exists'
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'registration_failed', message: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}