import { describe, it, expect, vi } from 'vitest'
import { requireTenantResource } from '@/lib/tenant-guard'
import type { AuthContext } from '@/lib/auth'

function ctx(overrides: Partial<AuthContext>): AuthContext {
  return {
    userId: 'u1',
    clerkUserId: 'c1',
    tenantId: 'tenant-A',
    tenantName: 'A',
    role: 'TENANT_ADMIN',
    branchId: null,
    branchName: null,
    isSuperAdmin: false,
    isTenantAdmin: true,
    isAdmin: true,
    isContractor: false,
    isEndUser: false,
    ...overrides,
  }
}

describe('requireTenantResource', () => {
  it('scopes the query to the caller tenant for a normal admin', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'x', tenantId: 'tenant-A' })
    const result = await requireTenantResource({ findFirst }, 'x', ctx({}))
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'x', tenantId: 'tenant-A' } })
    expect(result).toEqual({ id: 'x', tenantId: 'tenant-A' })
  })

  it('does not add a tenant filter for a super admin (cross-tenant read)', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'x', tenantId: 'tenant-B' })
    await requireTenantResource({ findFirst }, 'x', ctx({ isSuperAdmin: true, tenantId: null }))
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'x' } })
  })

  it('fails closed (returns null, never queries) when a non-super-admin has no tenant', async () => {
    const findFirst = vi.fn()
    const result = await requireTenantResource({ findFirst }, 'x', ctx({ tenantId: null }))
    expect(result).toBeNull()
    expect(findFirst).not.toHaveBeenCalled()
  })

  it('forwards include/select options', async () => {
    const findFirst = vi.fn().mockResolvedValue(null)
    await requireTenantResource({ findFirst }, 'x', ctx({}), { include: { profile: true } })
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'x', tenantId: 'tenant-A' }, include: { profile: true } })
  })
})
