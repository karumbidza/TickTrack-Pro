/**
 * TRIAL MANAGEMENT UTILITIES
 * ==========================
 * Handles trial status checks, lockout logic, and grace periods
 * 
 * Trial Flow:
 * 1. 14-day free trial starts on registration
 * 2. Trial expires → Account locked (can only view billing page)
 * 3. Payment made → Account unlocked
 * 
 * Email Reminders:
 * - Day 1: Welcome + trial started (14 days remaining)
 * - Day 7: Mid-trial reminder (7 days remaining)
 * - Day 12: Urgent reminder (2 days remaining)
 * - Day 14: Trial expired notification
 */

import { prisma } from '@/lib/prisma'

export interface TrialStatus {
  isInTrial: boolean
  isTrialExpired: boolean
  isLocked: boolean
  trialEndsAt: Date | null
  daysRemaining: number
  message: string
  canAccessApp: boolean
}

/**
 * Check the trial status for a tenant
 */
export async function getTrialStatus(tenantId: string): Promise<TrialStatus> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: true
    }
  })

  if (!tenant) {
    return {
      isInTrial: false,
      isTrialExpired: true,
      isLocked: true,
      trialEndsAt: null,
      daysRemaining: 0,
      message: 'Tenant not found',
      canAccessApp: false
    }
  }

  const now = new Date()
  const trialEndsAt = tenant.trialEndsAt || tenant.subscription?.trialEndsAt

  // If no trial date, check subscription status
  if (!trialEndsAt) {
    const isActive = tenant.status === 'ACTIVE' || 
                     tenant.subscription?.status === 'ACTIVE'
    return {
      isInTrial: false,
      isTrialExpired: !isActive,
      isLocked: !isActive,
      trialEndsAt: null,
      daysRemaining: 0,
      message: isActive ? 'Active subscription' : 'No active subscription',
      canAccessApp: isActive
    }
  }

  // Calculate days remaining
  const msRemaining = trialEndsAt.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))

  // Trial is still active
  if (daysRemaining > 0) {
    return {
      isInTrial: true,
      isTrialExpired: false,
      isLocked: false,
      trialEndsAt,
      daysRemaining,
      message: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining in trial`,
      canAccessApp: true
    }
  }

  // Trial has expired - check if they have an active subscription
  const hasActiveSubscription = tenant.subscription?.status === 'ACTIVE' ||
                                 tenant.status === 'ACTIVE'
  
  if (hasActiveSubscription) {
    return {
      isInTrial: false,
      isTrialExpired: true,
      isLocked: false,
      trialEndsAt,
      daysRemaining: 0,
      message: 'Active subscription',
      canAccessApp: true
    }
  }

  // Trial expired and no active subscription - LOCKED
  return {
    isInTrial: false,
    isTrialExpired: true,
    isLocked: true,
    trialEndsAt,
    daysRemaining: 0,
    message: 'Your free trial has expired. Please subscribe to continue using TickTrack Pro.',
    canAccessApp: false
  }
}

/**
 * Check trial status for a user (via their tenant)
 */
export async function getUserTrialStatus(userId: string): Promise<TrialStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true, role: true }
  })

  // Super admins are never locked
  if (user?.role === 'SUPER_ADMIN') {
    return {
      isInTrial: false,
      isTrialExpired: false,
      isLocked: false,
      trialEndsAt: null,
      daysRemaining: 0,
      message: 'Super Admin',
      canAccessApp: true
    }
  }

  if (!user?.tenantId) {
    return null
  }

  return getTrialStatus(user.tenantId)
}

/**
 * Lock a tenant's account (used when trial expires)
 */
export async function lockTenantAccount(tenantId: string): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'READ_ONLY'
    }
  })

  // Also update subscription status
  await prisma.subscription.updateMany({
    where: { 
      tenantId,
      status: 'TRIAL'
    },
    data: {
      status: 'EXPIRED'
    }
  })
}

/**
 * Unlock a tenant's account (used when payment is made)
 */
export async function unlockTenantAccount(tenantId: string, plan: string = 'BASIC'): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'ACTIVE'
    }
  })

  // Update subscription to active
  const now = new Date()
  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + 1) // 1 month from now

  await prisma.subscription.upsert({
    where: { tenantId },
    update: {
      status: 'ACTIVE',
      plan: plan as any,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null // Clear trial
    },
    create: {
      tenantId,
      status: 'ACTIVE',
      plan: plan as any,
      amount: 0,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd
    }
  })
}

/**
 * Get all tenants with expiring trials for reminder emails
 */
export async function getExpiringTrials(daysUntilExpiry: number): Promise<Array<{
  tenantId: string
  tenantName: string
  adminEmail: string
  adminName: string
  trialEndsAt: Date
  daysRemaining: number
}>> {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + daysUntilExpiry)
  
  // Set to start and end of that day
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  const tenants = await prisma.tenant.findMany({
    where: {
      status: 'TRIAL',
      trialEndsAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      users: {
        where: { role: 'TENANT_ADMIN' },
        take: 1
      }
    }
  })

  return tenants.map(tenant => ({
    tenantId: tenant.id,
    tenantName: tenant.name,
    adminEmail: tenant.users[0]?.email || tenant.email || '',
    adminName: tenant.users[0]?.name || 'Admin',
    trialEndsAt: tenant.trialEndsAt!,
    daysRemaining: daysUntilExpiry
  }))
}

/**
 * Get all tenants with expired trials (for lockout processing)
 */
export async function getExpiredTrials(): Promise<Array<{
  tenantId: string
  tenantName: string
  adminEmail: string
  trialEndsAt: Date
}>> {
  const now = new Date()

  const tenants = await prisma.tenant.findMany({
    where: {
      status: 'TRIAL',
      trialEndsAt: {
        lt: now
      }
    },
    include: {
      users: {
        where: { role: 'TENANT_ADMIN' },
        take: 1
      }
    }
  })

  return tenants.map(tenant => ({
    tenantId: tenant.id,
    tenantName: tenant.name,
    adminEmail: tenant.users[0]?.email || tenant.email || '',
    trialEndsAt: tenant.trialEndsAt!
  }))
}

/**
 * Format date for display
 */
export function formatTrialDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Calculate payment due date (trial end date)
 */
export function getPaymentDueDate(trialEndsAt: Date): string {
  return formatTrialDate(trialEndsAt)
}
