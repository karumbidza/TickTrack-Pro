import { auth, currentUser } from '@clerk/nextjs/server'

export interface AuthContext {
  userId: string
  clerkUserId: string
  tenantId: string | null
  tenantName: string | null
  role: string
  branchId: string | null
  branchName: string | null
  isSuperAdmin: boolean
  isTenantAdmin: boolean
  isAdmin: boolean
  isContractor: boolean
  isEndUser: boolean
}

const ADMIN_ROLES = [
  'TENANT_ADMIN',
  'IT_ADMIN',
  'SALES_ADMIN',
  'RETAIL_ADMIN',
  'MAINTENANCE_ADMIN',
  'PROJECTS_ADMIN',
]

export async function getAuthContext(): Promise<AuthContext | null> {
  const { userId } = await auth()
  if (!userId) return null

  // Always use currentUser() for live metadata — sessionClaims.publicMetadata
  // is only populated when a custom Clerk JWT template explicitly includes it,
  // and partial templates (e.g. role only, no tenantId) cause silent data loss.
  const user = await currentUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>

  const role = (meta.role as string) ?? 'END_USER'
  const dbUserId = (meta.dbUserId as string) ?? userId

  return {
    userId: dbUserId,
    clerkUserId: userId,
    tenantId: meta.tenantId ?? null,
    tenantName: meta.tenantName ?? null,
    role,
    branchId: meta.branchId ?? null,
    branchName: meta.branchName ?? null,
    isSuperAdmin: role === 'SUPER_ADMIN',
    isTenantAdmin: role === 'TENANT_ADMIN',
    isAdmin: ADMIN_ROLES.includes(role),
    isContractor: role === 'CONTRACTOR',
    isEndUser: role === 'END_USER',
  }
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) throw new Error('Unauthorized')
  return ctx
}

export async function requireTenantAuth(): Promise<AuthContext & { tenantId: string }> {
  const ctx = await requireAuth()
  if (!ctx.tenantId) throw new Error('No organisation context')
  return ctx as AuthContext & { tenantId: string }
}
