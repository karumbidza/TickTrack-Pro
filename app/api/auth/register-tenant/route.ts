import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

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
      adminPassword,
      adminPhone,
      customRequirements
    } = body

    // Validate required fields
    if (!companyName || !companyEmail || !adminName || !adminEmail || !adminPassword || !companySize) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Admin email already exists' },
        { status: 409 }
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

    // Hash password
    const hashedPassword = await hash(adminPassword, 12)

    // Calculate trial end date (30 days from now)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 30)

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

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
          phone: adminPhone || null,
          role: 'TENANT_ADMIN',
          tenantId: tenant.id,
          emailVerified: null // Will be verified via email
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

    // TODO: Send verification email
    // await sendVerificationEmail(adminEmail, result.adminUser.id)

    // TODO: Send welcome email with trial information
    // await sendWelcomeEmail(companyEmail, companyName, trialEndsAt)

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

  } catch (error) {
    logger.error('Tenant registration error:', error)
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { message: 'Company name or email already exists' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { message: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}