import { timingSafeEqual } from 'crypto'

/**
 * Guard for the cross-product admin adapter (`/api/admin/*`) consumed by Pulse,
 * the command center. Requests carry `Authorization: Bearer $ADMIN_ADAPTER_SECRET`.
 * The routes behind this guard use Prisma directly (no per-request tenant scoping),
 * so this check is the only boundary — refuse when the secret is unset.
 */
export function adapterAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_ADAPTER_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
