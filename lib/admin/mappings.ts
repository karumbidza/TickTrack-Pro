/**
 * Translations between TickTrack's own vocabulary and the neutral admin-adapter
 * contract Pulse understands. Keeping these in one place means the route handlers
 * stay thin and the mapping is auditable.
 */

// Tenant lifecycle → the contract's binary operational status.
const OPERATIONAL = new Set(['ACTIVE', 'TRIAL', 'GRACE'])
export function tenantStatus(status: string): string {
  return OPERATIONAL.has(status) ? 'active' : 'suspended'
}

// User account lifecycle → the contract's status ('active' | 'disabled' | 'pending').
export function userStatus(status: string): string {
  if (status === 'ACTIVE') return 'active'
  if (status === 'SUSPENDED' || status === 'DEACTIVATED') return 'disabled'
  return 'pending' // PENDING_APPROVAL, APPROVED_EMAIL_PENDING
}

// Roles Pulse may assign in TickTrack. SUPER_ADMIN is platform-level and never
// assignable/manageable through a tenant-scoped control plane.
export const ASSIGNABLE_ROLES = [
  'TENANT_ADMIN',
  'IT_ADMIN',
  'SALES_ADMIN',
  'RETAIL_ADMIN',
  'MAINTENANCE_ADMIN',
  'PROJECTS_ADMIN',
  'CONTRACTOR',
  'END_USER',
] as const

export function canManageRole(role: string): boolean {
  return role !== 'SUPER_ADMIN'
}
