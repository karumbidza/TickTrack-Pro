import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Strong password validation
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

const activateAccountSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

// GET - Validate activation token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Token is required' 
      }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { activationToken: token },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        activationExpires: true,
        tenant: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ 
        valid: false,
        error: 'Invalid activation link. Please contact your administrator.'
      }, { status: 404 })
    }

    // Check if token is expired
    if (user.activationExpires && new Date() > user.activationExpires) {
      return NextResponse.json({ 
        valid: false,
        error: 'This activation link has expired. Please contact your administrator for a new one.',
        expired: true
      }, { status: 400 })
    }

    // Check if already activated
    if (user.status === 'ACTIVE') {
      return NextResponse.json({ 
        valid: false,
        error: 'This account has already been activated.',
        alreadyActive: true
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      tenant: user.tenant
    })

  } catch (error) {
    console.error('Error validating activation token:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate activation link' },
      { status: 500 }
    )
  }
}

// POST - Activate account (set password)
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const body = await request.json()
    const validatedData = activateAccountSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { activationToken: token },
      include: {
        tenant: { select: { name: true } }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid activation link' },
        { status: 404 }
      )
    }

    if (user.activationExpires && new Date() > user.activationExpires) {
      return NextResponse.json(
        { error: 'This activation link has expired' },
        { status: 400 }
      )
    }

    if (user.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'This account has already been activated' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Activate the account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        status: 'ACTIVE',
        isActive: true,
        emailVerified: new Date(),
        activationToken: null,
        activationExpires: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Account activated successfully. You can now log in.',
      redirect: '/auth/signin'
    })

  } catch (error) {
    console.error('Error activating account:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to activate account' },
      { status: 500 }
    )
  }
}
