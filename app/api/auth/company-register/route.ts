import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/africastalking-service'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'

// Strong password validation
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

const companyRegisterSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  password: passwordSchema,
  address: z.string().optional()
})

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = companyRegisterSchema.parse(body)

    // Validate phone number format
    const formattedPhone = formatPhoneNumber(validatedData.phone)
    if (!isValidPhoneNumber(formattedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use international format (e.g., +263 77 123 4567)' },
        { status: 400 }
      )
    }

    // Check if user email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Generate unique slug for the company
    let slug = generateSlug(validatedData.companyName)
    let slugExists = await prisma.tenant.findUnique({ where: { slug } })
    let counter = 1
    while (slugExists) {
      slug = `${generateSlug(validatedData.companyName)}-${counter}`
      slugExists = await prisma.tenant.findUnique({ where: { slug } })
      counter++
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create tenant and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the tenant (company)
      const tenant = await tx.tenant.create({
        data: {
          name: validatedData.companyName,
          slug,
          email: validatedData.email,
          phone: formattedPhone,
          address: validatedData.address || null,
          status: 'TRIAL',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
          features: JSON.stringify({
            maxUsers: 5,
            maxBranches: 2,
            maxAssets: 50,
            ticketManagement: true,
            assetTracking: true,
            contractorManagement: true,
            invoicing: true,
            reporting: true
          })
        }
      })

      // Create the admin user
      const admin = await tx.user.create({
        data: {
          name: validatedData.adminName,
          email: validatedData.email,
          phone: formattedPhone,
          password: hashedPassword,
          role: 'TENANT_ADMIN',
          tenantId: tenant.id,
          status: 'ACTIVE', // Admin is active after email verification
          isActive: true,
          emailVerified: null // Will be set when email is verified
        }
      })

      // Create head office branch
      await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: 'Head Office',
          type: 'HEAD_OFFICE',
          isHeadOffice: true,
          isActive: true
        }
      })

      // Create verification token
      await tx.verificationToken.create({
        data: {
          identifier: validatedData.email,
          token: verificationToken,
          expires: tokenExpires
        }
      })

      return { tenant, admin }
    })

    // Send verification email
    try {
      const verificationLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verificationToken}`
      await sendVerificationEmail(validatedData.email, validatedData.adminName, verificationLink)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Continue - don't fail registration if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Company registered successfully. Please check your email to verify your account.',
      company: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug
      }
    })

  } catch (error) {
    console.error('Company registration error:', error)
    
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to register company. Please try again.' },
      { status: 500 }
    )
  }
}
