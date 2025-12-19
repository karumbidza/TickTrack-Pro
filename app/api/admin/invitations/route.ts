import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
  expiresInHours: z.number().min(1).max(168).default(72) // 1 hour to 7 days, default 72 hours
})

// GET - List all invitations for the tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view invitations
    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'all'

    const where: any = {
      tenantId: tenantId!
    }

    if (status !== 'all') {
      where.status = status
    }

    const invitations = await prisma.userInvitation.findMany({
      where,
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true }
        },
        user: {
          select: { id: true, name: true, email: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ invitations })

  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

// POST - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create invitations
    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = createInvitationSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Check if there's an existing pending invitation
    const existingInvitation = await prisma.userInvitation.findFirst({
      where: {
        tenantId: tenantId!,
        email: validatedData.email,
        status: 'pending'
      }
    })

    if (existingInvitation) {
      // Delete the existing invitation and create a new one
      await prisma.userInvitation.delete({
        where: { id: existingInvitation.id }
      })
      console.log(`🔄 Replaced existing invitation for ${validatedData.email}`)
    }

    // Get tenant info for email
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId! },
      select: { name: true }
    })

    // Create the invitation
    const expiresAt = new Date(Date.now() + validatedData.expiresInHours * 60 * 60 * 1000)
    
    const invitation = await prisma.userInvitation.create({
      data: {
        tenantId: tenantId!,
        email: validatedData.email,
        name: validatedData.name || null,
        invitedById: session.user.id,
        expiresAt,
        status: 'pending'
      },
      include: {
        invitedBy: {
          select: { name: true }
        }
      }
    })

    // Send invitation email
    const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/accept-invitation/${invitation.token}`
    
    // Log invite link for development (when email may not work)
    console.log('📧 INVITATION LINK (for development testing):')
    console.log(`   Email: ${validatedData.email}`)
    console.log(`   Link: ${inviteLink}`)
    console.log('   Copy and paste this link in your browser to accept the invitation')
    
    let emailSent = false
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">You've Been Invited!</h2>
          <p>Hi${validatedData.name ? ` ${validatedData.name}` : ''},</p>
          <p><strong>${session.user.name}</strong> has invited you to join <strong>${tenant?.name}</strong> on TickTrack Pro.</p>
          <p>Click the button below to accept the invitation and create your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This invitation will expire in ${validatedData.expiresInHours} hours.
          </p>
          <p style="color: #666; font-size: 14px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            TickTrack Pro - Ticket & Asset Management System
          </p>
        </div>
      `
      await sendEmail(
        validatedData.email,
        `You're invited to join ${tenant?.name} on TickTrack Pro`,
        emailHtml
      )
      emailSent = true
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      console.log('⚠️ Email not sent - use the invitation link from the console above')
      // Don't fail the invitation creation
    }

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? 'Invitation sent successfully' 
        : 'Invitation created (email delivery may be delayed - check console for link)',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
        inviteLink // Include the link in the response for development
      }
    })

  } catch (error) {
    console.error('Error creating invitation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    )
  }
}
