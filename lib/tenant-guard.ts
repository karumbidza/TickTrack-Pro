import type { AuthContext } from '@/lib/auth'

/**
 * TENANT RESOURCE GUARD
 * =====================
 * Single, enforced way to load a tenant-owned record. Routing every
 * `[id]` lookup through this prevents the "GET forgot what PATCH remembered"
 * class of cross-tenant IDOR bugs.
 *
 * Rules:
 * - SUPER_ADMIN may read across tenants (id-only match).
 * - Everyone else is pinned to their own tenantId.
 * - A null/absent tenantId fails CLOSED (returns null) — it must never
 *   collapse into an unscoped query.
 * - Callers map a null return to 404 and must NOT distinguish
 *   "does not exist" from "not yours".
 *
 * The delegate must be a Prisma model whose rows carry a `tenantId` column
 * (User, Contractor, Ticket, Asset, Invoice, Branch, …). For models without
 * their own tenantId (Rating, QuoteRequest, Message), scope via their
 * tenant-owned parent instead of calling this directly.
 */
interface TenantScopedDelegate {
  findFirst: (args: any) => Promise<any>
}

export async function requireTenantResource(
  model: TenantScopedDelegate,
  id: string,
  ctx: AuthContext,
  opts: { include?: any; select?: any } = {}
): Promise<any | null> {
  if (!ctx.isSuperAdmin && !ctx.tenantId) return null // fail closed
  const where = ctx.isSuperAdmin ? { id } : { id, tenantId: ctx.tenantId as string }
  return model.findFirst({ where, ...opts })
}
