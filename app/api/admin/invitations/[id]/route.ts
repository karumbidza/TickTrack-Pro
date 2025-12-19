import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

// GET - Get a single invitation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const invitation = await prisma.userInvitation.findUnique({
      where: { id: params.id },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true }
        },
        user: {
          select: { id: true, name: true, email: true, status: true, role: true }
        },
        tenant: {
          select: { id: true, name: true }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Verify tenant access
    if (session.user.role !== 'SUPER_ADMIN' && invitation.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ invitation })

  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    )
  }
}

// PATCH - Cancel or resend an invitation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body // 'cancel' or 'resend'

    const invitation = await prisma.userInvitation.findUnique({
      where: { id: params.id },
      include: { tenant: { select: { name: true } } }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Verify tenant access
    if (session.user.role !== 'SUPER_ADMIN' && invitation.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (action === 'cancel') {
      if (invitation.status !== 'pending') {
        return NextResponse.json(
          { error: 'Only pending invitations can be cancelled' },
          { status: 400 }
        )
      }

      await prisma.userInvitation.update({
        where: { id: params.id },
        data: { status: 'cancelled' }
      })

      return NextResponse.json({
        success: true,
        message: 'Invitation cancelled successfully'
      })

    } else if (action === 'resend') {
      if (invitation.status !== 'pending' && invitation.status !== 'expired') {
        return NextResponse.json(
          { error: 'Only pending or expired invitations can be resent' },
          { status: 400 }
        )
      }

      // Update expiration and generate new token
      const newExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours
      
      const updatedInvitation = await prisma.userInvitation.update({
        where: { id: params.id },
        data: {
          expiresAt: newExpiresAt,
          status: 'pending',
          token: crypto.randomUUID()
        }
      })

      // Send new invitation email
      const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/accept-invitation/${updatedInvitation.token}`
      
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Invitation Reminder</h2>
            <p>Hi${invitation.name ? ` ${invitation.name}` : ''},</p>
            <p>This is a reminder that you've been invited to join <strong>${invitation.tenant.name}</strong> on TickTrack Pro.</p>
            <p>Click the button below to accept the invitation and create your account:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This invitation will expire in 72 hours.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              TickTrack Pro - Ticket & Asset Management System
            </p>
          </div>
        `
        await sendEmail(
          invitation.email,
          `Reminder: You're invited to join ${invitation.tenant.name} on TickTrack Pro`,
          emailHtml
        )
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError)
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation resent successfully',
        invitation: {
          id: updatedInvitation.id,
          expiresAt: updatedInvitation.expiresAt
        }
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "cancel" or "resend"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error updating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to update invitation' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const invitation = await prisma.userInvitation.findUnique({
      where: { id: params.id }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Verify tenant access
    if (session.user.role !== 'SUPER_ADMIN' && invitation.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only allow deleting cancelled or expired invitations
    if (invitation.status === 'pending') {
      return NextResponse.json(
        { error: 'Cancel the invitation before deleting it' },
        { status: 400 }
      )
    }

    if (invitation.userId) {
      return NextResponse.json(
        { error: 'Cannot delete an invitation that has been accepted' },
        { status: 400 }
      )
    }

    await prisma.userInvitation.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting invitation:', error)
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    )
  }
}
