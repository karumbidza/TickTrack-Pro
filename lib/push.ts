import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, unknown>
}

/**
 * Send an Expo push message to a set of Expo push tokens. Prunes tokens that
 * Expo reports as no longer registered. Fire-and-forget: never throws into the
 * caller's request path.
 */
export async function sendExpoPush(tokens: string[], payload: PushPayload): Promise<void> {
  const valid = tokens.filter((t) => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'))
  if (valid.length === 0) return

  const messages = valid.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: 'default' as const,
  }))

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    })
    const json: any = await res.json().catch(() => null)
    const tickets: any[] = json?.data ?? []
    // Remove tokens Expo says are no longer registered.
    const dead: string[] = []
    tickets.forEach((t, i) => {
      if (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered') dead.push(valid[i])
    })
    if (dead.length) {
      await prisma.pushToken.deleteMany({ where: { token: { in: dead } } })
    }
  } catch (error) {
    logger.error('[push] Failed to send Expo push:', error)
  }
}

/** Look up a user's registered devices and push a notification to all of them. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } })
    if (tokens.length === 0) return
    await sendExpoPush(tokens.map((t) => t.token), payload)
  } catch (error) {
    logger.error('[push] sendPushToUser error:', error)
  }
}
