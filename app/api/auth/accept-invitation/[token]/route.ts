import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/africastalking-service'
import { z } from 'zod'

// GET - Validate invitation token
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

    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        invitedBy: {
          select: {
            name: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ 
        valid: false,
        error: 'Invalid invitation link'
      }, { status: 404 })
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      // Update status to expired
      await prisma.userInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' }
      })

      return NextResponse.json({ 
        valid: false,
        error: 'This invitation has expired. Please contact your administrator for a new invitation.',
        expired: true
      }, { status: 400 })
    }

    // Check if already used
    if (invitation.status === 'accepted') {
      return NextResponse.json({ 
        valid: false,
        error: 'This invitation has already been used.',
        used: true
      }, { status: 400 })
    }

    // Check if cancelled
    if (invitation.status === 'cancelled') {
      return NextResponse.json({ 
        valid: false,
        error: 'This invitation has been cancelled.',
        cancelled: true
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        expiresAt: invitation.expiresAt,
        invitedBy: invitation.invitedBy?.name
      },
      tenant: invitation.tenant
    })

  } catch (error) {
    console.error('Error validating invitation:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate invitation' },
      { status: 500 }
    )
  }
}

// POST - Accept invitation and create user account
const acceptInvitationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone number is required')
})

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const body = await request.json()
    const validatedData = acceptInvitationSchema.parse(body)

    // Validate phone number
    const formattedPhone = formatPhoneNumber(validatedData.phone)
    if (!isValidPhoneNumber(formattedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use international format (e.g., +263 77 123 4567)' },
        { status: 400 }
      )
    }

    // Get invitation
    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
      include: {
        tenant: { select: { name: true } }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      )
    }

    // Validate invitation status
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'This invitation is no longer valid' },
        { status: 400 }
      )
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Check email matches (prevent using invite for different email)
    if (validatedData.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email address does not match the invitation' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create user in PENDING_APPROVAL status (no password yet)
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          phone: formattedPhone,
          tenantId: invitation.tenantId,
          role: 'END_USER', // Default role, admin will change this
          status: 'PENDING_APPROVAL',
          isActive: false, // Not active until approved and activated
          invitedById: invitation.invitedById
        }
      })

      // Update invitation
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          userId: user.id
        }
      })

      return user
    })

    return NextResponse.json({
      success: true,
      message: 'Your request has been submitted. You will receive an email once your account is approved.',
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        status: result.status
      }
    })

  } catch (error) {
    console.error('Error accepting invitation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
