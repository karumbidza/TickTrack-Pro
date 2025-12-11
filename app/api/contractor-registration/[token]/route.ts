import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Validate invitation token and get tenant info
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json({ message: 'Token is required' }, { status: 400 })
    }

    const invitation = await prisma.contractorInvitation.findUnique({
      where: { token },
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

    if (!invitation) {
      return NextResponse.json({ 
        message: 'Invalid invitation link',
        valid: false
      }, { status: 404 })
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ 
        message: 'This invitation has expired. Please contact the administrator for a new invitation.',
        valid: false,
        expired: true
      }, { status: 400 })
    }

    // Check if already used
    if (invitation.status === 'used') {
      return NextResponse.json({ 
        message: 'This invitation has already been used.',
        valid: false,
        used: true
      }, { status: 400 })
    }

    // Check if KYC already submitted
    const existingKYC = await prisma.contractorKYC.findFirst({
      where: {
        invitationId: invitation.id
      }
    })

    if (existingKYC) {
      return NextResponse.json({
        message: 'KYC has already been submitted for this invitation',
        valid: false,
        kycSubmitted: true,
        kycStatus: existingKYC.status
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt
      },
      tenant: invitation.tenant
    })

  } catch (error) {
    console.error('Error validating invitation:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
