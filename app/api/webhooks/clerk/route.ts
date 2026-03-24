import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return new Response('No webhook secret', { status: 500 })
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  const { type: eventType } = evt

  // user.created — sync to DB
  if (eventType === 'user.created') {
    const email = evt.data.email_addresses?.[0]?.email_address
    if (email) {
      const role = (evt.data.public_metadata?.role as string) ?? 'END_USER'
      const tenantId = evt.data.public_metadata?.tenantId as string | undefined

      await prisma.user.upsert({
        where: { email },
        update: { clerkId: evt.data.id },
        create: {
          clerkId: evt.data.id,
          email,
          name: [evt.data.first_name, evt.data.last_name].filter(Boolean).join(' ') || null,
          role: role as any,
          tenantId: tenantId ?? null,
          status: 'ACTIVE',
        },
      })
    }
  }

  // user.updated — sync metadata changes
  if (eventType === 'user.updated') {
    const email = evt.data.email_addresses?.[0]?.email_address
    if (email) {
      const role = evt.data.public_metadata?.role as string | undefined
      await prisma.user.updateMany({
        where: { clerkId: evt.data.id },
        data: {
          email,
          name: [evt.data.first_name, evt.data.last_name].filter(Boolean).join(' ') || null,
          ...(role ? { role: role as any } : {}),
        },
      })
    }
  }

  // user.deleted — soft delete
  if (eventType === 'user.deleted' && evt.data.id) {
    await prisma.user.updateMany({
      where: { clerkId: evt.data.id },
      data: { status: 'DEACTIVATED', isActive: false },
    })
  }

  // organization.created — create tenant
  if (eventType === 'organization.created') {
    await prisma.tenant.upsert({
      where: { clerkOrgId: evt.data.id },
      update: { name: evt.data.name },
      create: {
        clerkOrgId: evt.data.id,
        name: evt.data.name,
        slug: evt.data.slug ?? evt.data.id,
        status: 'TRIAL',
      },
    })
  }

  return new Response('', { status: 200 })
}
