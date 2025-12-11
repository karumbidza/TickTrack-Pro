import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface FeatureLimits {
  maxUsers: number
  maxTicketsPerMonth: number
  hasContractorNetwork: boolean
  hasInvoiceManagement: boolean
  hasAdvancedReporting: boolean
  hasApiAccess: boolean
  hasCustomWorkflows: boolean
  hasSSO: boolean
  hasPrioritySupport: boolean
  hasWhiteLabel: boolean
}

export class FeatureGatingService {
  /**
   * Get feature limits based on subscription plan
   */
  static getFeatureLimits(plan: string, status: string): FeatureLimits {
    // During trial, give full access
    if (status === 'TRIAL') {
      return {
        maxUsers: 1000, // High limit for trial
        maxTicketsPerMonth: 5000,
        hasContractorNetwork: true,
        hasInvoiceManagement: true,
        hasAdvancedReporting: true,
        hasApiAccess: true,
        hasCustomWorkflows: true,
        hasSSO: false, // Enterprise only
        hasPrioritySupport: false,
        hasWhiteLabel: false
      }
    }

    switch (plan) {
      case 'BASIC':
        return {
          maxUsers: 10,
          maxTicketsPerMonth: 1000,
          hasContractorNetwork: false,
          hasInvoiceManagement: false,
          hasAdvancedReporting: false,
          hasApiAccess: false,
          hasCustomWorkflows: false,
          hasSSO: false,
          hasPrioritySupport: false,
          hasWhiteLabel: false
        }

      case 'PRO':
        return {
          maxUsers: 50,
          maxTicketsPerMonth: 5000,
          hasContractorNetwork: true,
          hasInvoiceManagement: true,
          hasAdvancedReporting: true,
          hasApiAccess: true,
          hasCustomWorkflows: true,
          hasSSO: false,
          hasPrioritySupport: true,
          hasWhiteLabel: false
        }

      case 'ENTERPRISE':
        return {
          maxUsers: -1, // Unlimited
          maxTicketsPerMonth: -1, // Unlimited
          hasContractorNetwork: true,
          hasInvoiceManagement: true,
          hasAdvancedReporting: true,
          hasApiAccess: true,
          hasCustomWorkflows: true,
          hasSSO: true,
          hasPrioritySupport: true,
          hasWhiteLabel: true
        }

      case 'CUSTOM':
        // Custom plans - load from tenant settings
        return {
          maxUsers: -1,
          maxTicketsPerMonth: -1,
          hasContractorNetwork: true,
          hasInvoiceManagement: true,
          hasAdvancedReporting: true,
          hasApiAccess: true,
          hasCustomWorkflows: true,
          hasSSO: true,
          hasPrioritySupport: true,
          hasWhiteLabel: true
        }

      default:
        // Expired or no subscription - very limited access
        return {
          maxUsers: 1,
          maxTicketsPerMonth: 10,
          hasContractorNetwork: false,
          hasInvoiceManagement: false,
          hasAdvancedReporting: false,
          hasApiAccess: false,
          hasCustomWorkflows: false,
          hasSSO: false,
          hasPrioritySupport: false,
          hasWhiteLabel: false
        }
    }
  }

  /**
   * Check if tenant can access a specific feature
   */
  static async canAccessFeature(
    tenantId: string, 
    feature: keyof Omit<FeatureLimits, 'maxUsers' | 'maxTicketsPerMonth'>
  ): Promise<boolean> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { subscription: true }
      })

      if (!tenant) return false

      const subscription = tenant.subscription
      const plan = subscription?.plan || 'BASIC'
      const status = tenant.status

      const limits = this.getFeatureLimits(plan, status)
      return limits[feature]
    } catch (error) {
      console.error('Error checking feature access:', error)
      return false
    }
  }

  /**
   * Check user limits
   */
  static async checkUserLimit(tenantId: string): Promise<{ canAddUser: boolean, currentCount: number, limit: number }> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { 
          subscription: true,
          users: true
        }
      })

      if (!tenant) {
        return { canAddUser: false, currentCount: 0, limit: 0 }
      }

      const subscription = tenant.subscription
      const plan = subscription?.plan || 'BASIC'
      const status = tenant.status

      const limits = this.getFeatureLimits(plan, status)
      const currentCount = tenant.users.length
      const limit = limits.maxUsers

      return {
        canAddUser: limit === -1 || currentCount < limit,
        currentCount,
        limit
      }
    } catch (error) {
      console.error('Error checking user limit:', error)
      return { canAddUser: false, currentCount: 0, limit: 0 }
    }
  }

  /**
   * Check monthly ticket limits
   */
  static async checkTicketLimit(tenantId: string): Promise<{ canCreateTicket: boolean, currentCount: number, limit: number }> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { subscription: true }
      })

      if (!tenant) {
        return { canCreateTicket: false, currentCount: 0, limit: 0 }
      }

      const subscription = tenant.subscription
      const plan = subscription?.plan || 'BASIC'
      const status = tenant.status

      const limits = this.getFeatureLimits(plan, status)
      const limit = limits.maxTicketsPerMonth

      // Get current month's ticket count
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const currentCount = await prisma.ticket.count({
        where: {
          tenantId,
          createdAt: {
            gte: startOfMonth
          }
        }
      })

      return {
        canCreateTicket: limit === -1 || currentCount < limit,
        currentCount,
        limit
      }
    } catch (error) {
      console.error('Error checking ticket limit:', error)
      return { canCreateTicket: false, currentCount: 0, limit: 0 }
    }
  }

  /**
   * Get tenant's current plan and limits
   */
  static async getTenantLimits(tenantId: string): Promise<{
    plan: string
    status: string
    limits: FeatureLimits
    userUsage: { current: number, limit: number }
    ticketUsage: { current: number, limit: number }
  } | null> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { 
          subscription: true,
          users: true
        }
      })

      if (!tenant) return null

      const subscription = tenant.subscription
      const plan = subscription?.plan || 'BASIC'
      const status = tenant.status

      const limits = this.getFeatureLimits(plan, status)
      
      // Get user usage
      const userUsage = {
        current: tenant.users.length,
        limit: limits.maxUsers
      }

      // Get ticket usage
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const currentTicketCount = await prisma.ticket.count({
        where: {
          tenantId,
          createdAt: {
            gte: startOfMonth
          }
        }
      })

      const ticketUsage = {
        current: currentTicketCount,
        limit: limits.maxTicketsPerMonth
      }

      return {
        plan,
        status,
        limits,
        userUsage,
        ticketUsage
      }
    } catch (error) {
      console.error('Error getting tenant limits:', error)
      return null
    }
  }

  /**
   * Check if trial is expired
   */
  static async isTrialExpired(tenantId: string): Promise<boolean> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      })

      if (!tenant || tenant.status !== 'TRIAL') return false
      if (!tenant.trialEndsAt) return false

      return tenant.trialEndsAt <= new Date()
    } catch (error) {
      console.error('Error checking trial expiration:', error)
      return false
    }
  }

  /**
   * Get trial days remaining
   */
  static async getTrialDaysRemaining(tenantId: string): Promise<number | null> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      })

      if (!tenant || tenant.status !== 'TRIAL' || !tenant.trialEndsAt) {
        return null
      }

      const daysRemaining = Math.ceil(
        (tenant.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      return Math.max(0, daysRemaining)
    } catch (error) {
      console.error('Error calculating trial days remaining:', error)
      return null
    }
  }
}

export default FeatureGatingService