import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'
import { sendContractorInvitationEmail } from '@/lib/email'

// POST - Send contractor invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ message: 'Invalid tenant. Super admins must switch to a tenant context to invite contractors.' }, { status: 400 })
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { id: true, name: true }
    })

    if (!tenant) {
      return NextResponse.json({ message: 'Tenant not found' }, { status: 400 })
    }

    const { email, companyName } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ message: 'Valid email is required' }, { status: 400 })
    }

    if (!companyName || companyName.trim().length < 2) {
      return NextResponse.json({ message: 'Company name is required' }, { status: 400 })
    }

    // Check if email already exists as a user
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json({ 
        message: 'A user with this email already exists' 
      }, { status: 400 })
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.contractorInvitation.findUnique({
      where: {
        tenantId_email: {
          tenantId: session.user.tenantId,
          email: email.toLowerCase()
        }
      }
    })

    if (existingInvitation && existingInvitation.status === 'pending') {
      // Check if expired
      if (new Date() < existingInvitation.expiresAt) {
        return NextResponse.json({ 
          message: 'An invitation has already been sent to this email',
          invitation: existingInvitation
        }, { status: 400 })
      }
    }

    // Check if there's already a KYC submission
    const existingKYC = await prisma.contractorKYC.findFirst({
      where: {
        tenantId: session.user.tenantId,
        companyEmail: email.toLowerCase()
      }
    })

    if (existingKYC) {
      return NextResponse.json({ 
        message: 'A KYC submission already exists for this email' 
      }, { status: 400 })
    }

    // Generate invitation token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create or update invitation
    const invitation = await prisma.contractorInvitation.upsert({
      where: {
        tenantId_email: {
          tenantId: session.user.tenantId,
          email: email.toLowerCase()
        }
      },
      update: {
        token,
        status: 'pending',
        expiresAt,
        invitedBy: session.user.id
      },
      create: {
        tenantId: session.user.tenantId,
        email: email.toLowerCase(),
        token,
        invitedBy: session.user.id,
        expiresAt
      }
    })

    // Generate registration link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const registrationLink = `${appUrl}/contractor-registration/${token}`

    // Send invitation email
    try {
      await sendContractorInvitationEmail(
        email.toLowerCase(),
        companyName,
        registrationLink,
        tenant.name || 'TickTrack Pro',
        expiresAt
      )
      logger.info('Contractor invitation email sent:', { email, registrationLink })
    } catch (emailError) {
      logger.warn('Failed to send invitation email, but invitation was created:', emailError)
    }

    logger.info('Contractor invitation created:', {
      email,
      registrationLink,
      expires: expiresAt.toISOString()
    })

    return NextResponse.json({
      message: 'Invitation created successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        expiresAt: invitation.expiresAt
      },
      registrationLink,
      tenantName: tenant.name
    })

  } catch (error) {
    logger.error('Error creating contractor invitation:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - List all invitations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ message: 'Invalid tenant' }, { status: 400 })
    }

    const invitations = await prisma.contractorInvitation.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ invitations })

  } catch (error) {
    logger.error('Error fetching invitations:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
