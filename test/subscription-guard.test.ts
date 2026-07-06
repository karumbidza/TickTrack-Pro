import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AuthContext } from '@/lib/auth'

const findUnique = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: { subscription: { findUnique: (...a: any[]) => findUnique(...a) } },
}))
// Avoid pulling the Clerk runtime into the test.
vi.mock('@/lib/auth', () => ({ getAuthContext: vi.fn() }))

import { enforceSubscription } from '@/lib/subscription-guard'

function ctx(overrides: Partial<AuthContext>): AuthContext {
  return {
    userId: 'u1', clerkUserId: 'c1', tenantId: 'tenant-A', tenantName: 'A',
    role: 'TENANT_ADMIN', branchId: null, branchName: null,
    isSuperAdmin: false, isTenantAdmin: true, isAdmin: true,
    isContractor: false, isEndUser: false, ...overrides,
  }
}

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

describe('enforceSubscription', () => {
  beforeEach(() => findUnique.mockReset())

  it('allows writes for an ACTIVE subscription', async () => {
    findUnique.mockResolvedValue({ status: 'ACTIVE', plan: 'PRO', currentPeriodEnd: future, gracePeriodEnd: null })
    expect(await enforceSubscription(ctx({}), 'write')).toBeNull()
  })

  it('blocks writes for READ_ONLY with 403', async () => {
    findUnique.mockResolvedValue({ status: 'READ_ONLY', plan: 'PRO', currentPeriodEnd: null, gracePeriodEnd: null })
    const res = await enforceSubscription(ctx({}), 'write')
    expect(res?.status).toBe(403)
  })

  it('blocks writes for SUSPENDED with 403', async () => {
    findUnique.mockResolvedValue({ status: 'SUSPENDED', plan: 'PRO', currentPeriodEnd: null, gracePeriodEnd: null })
    const res = await enforceSubscription(ctx({}), 'write')
    expect(res?.status).toBe(403)
  })

  it('blocks writes when there is no subscription', async () => {
    findUnique.mockResolvedValue(null)
    const res = await enforceSubscription(ctx({}), 'write')
    expect(res?.status).toBe(403)
  })

  it('allows writes during GRACE', async () => {
    findUnique.mockResolvedValue({ status: 'GRACE', plan: 'PRO', currentPeriodEnd: future, gracePeriodEnd: future })
    expect(await enforceSubscription(ctx({}), 'write')).toBeNull()
  })

  it('bypasses for SUPER_ADMIN without hitting the database', async () => {
    const res = await enforceSubscription(ctx({ isSuperAdmin: true, tenantId: null }), 'write')
    expect(res).toBeNull()
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('blocks a non-super-admin with no tenant', async () => {
    const res = await enforceSubscription(ctx({ tenantId: null }), 'write')
    expect(res?.status).toBe(403)
  })
})
