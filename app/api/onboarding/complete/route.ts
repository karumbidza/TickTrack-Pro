import { NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use currentUser() to get live metadata (sessionClaims.publicMetadata is empty in Clerk v6)
  const clerkUser = await currentUser()
  const meta = (clerkUser?.publicMetadata ?? {}) as Record<string, string | null>
  if (meta.tenantId) {
    return NextResponse.json({ error: 'Already onboarded' }, { status: 400 })
  }

  const { companyName } = await req.json()
  if (!companyName?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  }

  const slug = companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const existing = await prisma.tenant.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: 'Company name already taken' }, { status: 409 })
  }

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  const tenant = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.create({
      data: {
        name: companyName.trim(),
        slug,
        status: 'TRIAL',
        trialEndsAt,
        settings: { onboardingCompleted: true },
      },
    })
    await tx.subscription.create({
      data: {
        tenantId: t.id,
        plan: 'BASIC',
        status: 'TRIAL',
        amount: 0,
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
      },
    })
    await tx.user.updateMany({
      where: { clerkId: userId },
      data: { tenantId: t.id, role: 'TENANT_ADMIN' },
    })
    return t
  })

  // Update Clerk metadata with tenantId
  const client = await clerkClient()
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...meta,
      role: 'TENANT_ADMIN',
      tenantId: tenant.id,
      tenantName: tenant.name,
    },
  })

  return NextResponse.json({ tenantId: tenant.id })
}
