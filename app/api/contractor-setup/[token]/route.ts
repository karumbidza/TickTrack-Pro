import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logger'

// GET - Validate password setup token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json({ message: 'Token is required' }, { status: 400 })
    }

    const kyc = await prisma.contractorKYC.findUnique({
      where: { passwordSetupToken: token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        }
      }
    })

    if (!kyc) {
      return NextResponse.json({ 
        message: 'Invalid setup link',
        valid: false
      }, { status: 404 })
    }

    if (kyc.status !== 'APPROVED') {
      return NextResponse.json({ 
        message: 'This account has already been set up or is not approved',
        valid: false
      }, { status: 400 })
    }

    if (kyc.passwordSetupExpires && new Date() > kyc.passwordSetupExpires) {
      return NextResponse.json({ 
        message: 'This setup link has expired. Please contact the administrator.',
        valid: false,
        expired: true
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      kyc: {
        id: kyc.id,
        companyName: kyc.companyName,
        companyEmail: kyc.companyEmail
      },
      tenant: kyc.tenant
    })

  } catch (error) {
    logger.error('Error validating setup token:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Set password and create user account
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const { password, confirmPassword } = await request.json()

    if (!password || password.length < 8) {
      return NextResponse.json({ 
        message: 'Password must be at least 8 characters' 
      }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ 
        message: 'Passwords do not match' 
      }, { status: 400 })
    }

    const kyc = await prisma.contractorKYC.findUnique({
      where: { passwordSetupToken: token },
      include: { tenant: true }
    })

    if (!kyc) {
      return NextResponse.json({ message: 'Invalid setup link' }, { status: 404 })
    }

    if (kyc.status !== 'APPROVED') {
      return NextResponse.json({ 
        message: 'This account has already been set up or is not approved' 
      }, { status: 400 })
    }

    if (kyc.passwordSetupExpires && new Date() > kyc.passwordSetupExpires) {
      return NextResponse.json({ 
        message: 'Setup link has expired' 
      }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user account
    const user = await prisma.user.create({
      data: {
        email: kyc.companyEmail.toLowerCase(),
        name: kyc.companyName,
        password: hashedPassword,
        role: 'CONTRACTOR',
        tenantId: kyc.tenantId,
        isActive: true,
        phone: kyc.companyPhone
      }
    })

    // Create contractor profile
    await prisma.contractor.create({
      data: {
        userId: user.id,
        tenantId: kyc.tenantId,
        specialties: kyc.specializations,
        bio: kyc.tradingName || kyc.companyName,
        certifications: kyc.specialLicenses as string[] || [],
        status: 'AVAILABLE'
      }
    })

    // Update KYC status to ACTIVE and link user
    await prisma.contractorKYC.update({
      where: { id: kyc.id },
      data: {
        status: 'ACTIVE',
        userId: user.id,
        passwordSetAt: new Date(),
        passwordSetupToken: null,
        passwordSetupExpires: null
      }
    })

    logger.info('Contractor account created:', {
      company: kyc.companyName,
      email: kyc.companyEmail,
      userId: user.id
    })

    return NextResponse.json({
      message: 'Account created successfully. You can now login.',
      email: kyc.companyEmail
    })

  } catch (error) {
    logger.error('Error setting up account:', error)
    
    // Check for unique constraint error
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
