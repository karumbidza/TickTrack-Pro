import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_ROLES = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']

// PATCH — revoke or resend an invitation
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tenantId, role } = authCtx

    if (!ADMIN_ROLES.includes(role) && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { action } = await request.json() // 'cancel' | 'resend'

    const invitation = await prisma.userInvitation.findUnique({
      where: { id: params.id },
      include: { tenant: { select: { name: true } } },
    })
    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    if (role !== 'SUPER_ADMIN' && invitation.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (action === 'cancel') {
      if (invitation.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending invitations can be cancelled' }, { status: 400 })
      }
      // Revoke in Clerk
      if (invitation.clerkInvitationId) {
        try {
          const client = await clerkClient()
          await client.invitations.revokeInvitation(invitation.clerkInvitationId)
        } catch { /* already expired or accepted */ }
      }
      await prisma.userInvitation.update({
        where: { id: params.id },
        data: { status: 'cancelled' },
      })
      return NextResponse.json({ success: true, message: 'Invitation cancelled' })
    }

    if (action === 'resend') {
      if (!['pending', 'expired'].includes(invitation.status)) {
        return NextResponse.json({ error: 'Only pending or expired invitations can be resent' }, { status: 400 })
      }
      // Revoke old Clerk invitation if it exists
      if (invitation.clerkInvitationId) {
        try {
          const client = await clerkClient()
          await client.invitations.revokeInvitation(invitation.clerkInvitationId)
        } catch { /* already expired */ }
      }
      // Create new Clerk invitation
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const client = await clerkClient()
      const clerkInvite = await client.invitations.createInvitation({
        emailAddress: invitation.email,
        redirectUrl: `${appUrl}/sign-in`,
        publicMetadata: {
          role: invitation.invitedRole ?? 'END_USER',
          tenantId: invitation.tenantId,
          tenantName: invitation.tenant?.name ?? null,
        },
        ignoreExisting: true,
      })
      await prisma.userInvitation.update({
        where: { id: params.id },
        data: {
          status: 'pending',
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          clerkInvitationId: clerkInvite.id,
        },
      })
      return NextResponse.json({ success: true, message: 'Invitation resent via Clerk' })
    }

    return NextResponse.json({ error: 'Invalid action. Use "cancel" or "resend"' }, { status: 400 })
  } catch (error) {
    console.error('Error updating invitation:', error)
    return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 })
  }
}

// DELETE — remove a cancelled/expired invitation record
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tenantId, role } = authCtx

    if (!ADMIN_ROLES.includes(role) && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const invitation = await prisma.userInvitation.findUnique({ where: { id: params.id } })
    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    if (role !== 'SUPER_ADMIN' && invitation.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    if (invitation.status === 'pending') {
      return NextResponse.json({ error: 'Cancel the invitation before deleting it' }, { status: 400 })
    }

    await prisma.userInvitation.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true, message: 'Invitation deleted' })
  } catch (error) {
    console.error('Error deleting invitation:', error)
    return NextResponse.json({ error: 'Failed to delete invitation' }, { status: 500 })
  }
}
