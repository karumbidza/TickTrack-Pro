import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum([
    'END_USER', 'TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN',
    'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN',
  ]).default('END_USER'),
  name: z.string().optional(),
})

const ADMIN_ROLES = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']

// GET — list invitations for this tenant
export async function GET(request: NextRequest) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tenantId, role } = authCtx

    if (!ADMIN_ROLES.includes(role) && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    if (!tenantId) return NextResponse.json({ error: 'No tenant context' }, { status: 400 })

    const status = request.nextUrl.searchParams.get('status') || 'all'

    const invitations = await prisma.userInvitation.findMany({
      where: { tenantId, ...(status !== 'all' ? { status } : {}) },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, name: true, email: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }
}

// POST — invite a user via Clerk
export async function POST(request: NextRequest) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId, tenantId, role: callerRole } = authCtx

    if (!ADMIN_ROLES.includes(callerRole) && callerRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    if (!tenantId) return NextResponse.json({ error: 'No tenant context' }, { status: 400 })

    const body = await request.json()
    const { email, role, name } = createInvitationSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    })

    // Revoke any existing pending invitation for this email
    const existingDbInvite = await prisma.userInvitation.findFirst({
      where: { tenantId, email, status: 'pending' },
    })
    if (existingDbInvite?.clerkInvitationId) {
      try {
        const client = await clerkClient()
        await client.invitations.revokeInvitation(existingDbInvite.clerkInvitationId)
      } catch { /* already expired */ }
      await prisma.userInvitation.update({
        where: { id: existingDbInvite.id },
        data: { status: 'cancelled' },
      })
    }

    // Send invitation via Clerk — publicMetadata applied to user on sign-up
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const client = await clerkClient()
    const clerkInvite = await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${appUrl}/sign-in`,
      publicMetadata: { role, tenantId, tenantName: tenant?.name ?? null },
      ignoreExisting: true,
    })

    // Save audit record in DB
    const invitation = await prisma.userInvitation.create({
      data: {
        tenantId,
        email,
        name: name ?? null,
        invitedById: userId,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        status: 'pending',
        clerkInvitationId: clerkInvite.id,
        invitedRole: role,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation sent — the user will receive an email from Clerk shortly.',
      invitation: { id: invitation.id, email, expiresAt: invitation.expiresAt },
    })
  } catch (error) {
    console.error('Error creating invitation:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}
