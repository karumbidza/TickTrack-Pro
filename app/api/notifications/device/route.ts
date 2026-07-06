import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/notifications/device  { token, platform? }
 * Register (or re-point) an Expo push token for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token, platform } = await request.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    // A device token belongs to exactly one user; re-registering re-points it.
    await prisma.pushToken.upsert({
      where: { token },
      update: { userId: ctx.userId, platform: platform ?? null },
      create: { token, userId: ctx.userId, platform: platform ?? null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to register push token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/notifications/device  { token }
 * Unregister a token (sign-out / disable notifications).
 */
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token } = await request.json().catch(() => ({}))
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    // Only delete the caller's own token.
    await prisma.pushToken.deleteMany({ where: { token, userId: ctx.userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to unregister push token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
