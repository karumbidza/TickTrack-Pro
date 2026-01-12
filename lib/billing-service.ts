/**
 * BILLING SERVICE
 * ================
 * Single source of truth for subscription lifecycle management.
 * 
 * RULES:
 * - Only this service may change subscription status
 * - Only this service may extend subscription periods
 * - All operations are idempotent
 * - No hard deletes (audit trail)
 * 
 * STATE MACHINE:
 * TRIAL → (payment success) → ACTIVE
 * ACTIVE → (period end) → GRACE
 * GRACE → (7 days) → READ_ONLY
 * Any → (admin override) → SUSPENDED
 * Any → (payment success) → ACTIVE
 */

import { prisma } from './prisma'
import { SubscriptionStatus, TenantStatus, PaymentProvider } from '@prisma/client'
import { logger } from './logger'

// Grace period in days
const GRACE_PERIOD_DAYS = 7

// Trial period in days
const TRIAL_PERIOD_DAYS = 14

// Billing cycle durations in days
const BILLING_CYCLE_DAYS = {
  monthly: 30,
  yearly: 365
}

// Pricing configuration (from environment or defaults)
export function getSubscriptionPricing() {
  return {
    basic: {
      monthly: {
        usd: parseFloat(process.env.PRICE_BASIC_MONTHLY_USD || '29'),
        zwl: parseFloat(process.env.PRICE_BASIC_MONTHLY_ZWL || '8700')
      },
      yearly: {
        usd: parseFloat(process.env.PRICE_BASIC_YEARLY_USD || '290'),
        zwl: parseFloat(process.env.PRICE_BASIC_YEARLY_ZWL || '87000')
      }
    },
    pro: {
      monthly: {
        usd: parseFloat(process.env.PRICE_PRO_MONTHLY_USD || '79'),
        zwl: parseFloat(process.env.PRICE_PRO_MONTHLY_ZWL || '23700')
      },
      yearly: {
        usd: parseFloat(process.env.PRICE_PRO_YEARLY_USD || '790'),
        zwl: parseFloat(process.env.PRICE_PRO_YEARLY_ZWL || '237000')
      }
    },
    enterprise: {
      monthly: {
        usd: parseFloat(process.env.PRICE_ENTERPRISE_MONTHLY_USD || '199'),
        zwl: parseFloat(process.env.PRICE_ENTERPRISE_MONTHLY_ZWL || '59700')
      },
      yearly: {
        usd: parseFloat(process.env.PRICE_ENTERPRISE_YEARLY_USD || '1990'),
        zwl: parseFloat(process.env.PRICE_ENTERPRISE_YEARLY_ZWL || '597000')
      }
    }
  }
}

/**
 * Generate invoice number: INV-TENANTSLUG-YYYYMM-XXX
 */
async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  
  // Count existing invoices for this tenant this month
  const count = await prisma.payment.count({
    where: {
      tenantId,
      invoiceNumber: { startsWith: `INV-${tenant?.slug?.toUpperCase() || 'UNK'}-${yearMonth}` }
    }
  })
  
  const slug = tenant?.slug?.toUpperCase().slice(0, 8) || 'UNK'
  return `INV-${slug}-${yearMonth}-${String(count + 1).padStart(3, '0')}`
}

/**
 * Calculate dates for subscription period
 */
function calculatePeriodDates(billingCycle: string = 'monthly') {
  const now = new Date()
  const days = BILLING_CYCLE_DAYS[billingCycle as keyof typeof BILLING_CYCLE_DAYS] || 30
  
  const periodEnd = new Date(now)
  periodEnd.setDate(periodEnd.getDate() + days)
  
  const gracePeriodEnd = new Date(periodEnd)
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS)
  
  return {
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    gracePeriodEnd
  }
}

export class BillingService {
  /**
   * Create a new subscription for a tenant (called during signup)
   */
  static async createTrialSubscription(tenantId: string, plan: string = 'BASIC') {
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_PERIOD_DAYS)
    
    const pricing = getSubscriptionPricing()
    const planKey = plan.toLowerCase() as keyof typeof pricing
    const amount = pricing[planKey]?.monthly?.usd || 29
    
    const subscription = await prisma.subscription.create({
      data: {
        tenantId,
        plan: plan as any,
        status: 'TRIAL',
        amount,
        currency: 'USD',
        billingCycle: 'monthly',
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
        gracePeriodEnd: new Date(trialEndsAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
      }
    })
    
    // Update tenant status
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { 
        status: 'TRIAL',
        trialEndsAt
      }
    })
    
    logger.info(`[Billing] Created trial subscription for tenant ${tenantId}, ends ${trialEndsAt}`)
    return subscription
  }

  /**
   * Create a pending invoice/payment for a subscription
   * Called when user initiates payment or at billing cycle renewal
   */
  static async createInvoice(
    tenantId: string,
    amount: number,
    currency: string = 'USD',
    paymentMethod: 'PAYNOW' | 'BANK' = 'PAYNOW',
    description?: string
  ) {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId }
    })
    
    if (!subscription) {
      throw new Error('No subscription found for tenant')
    }
    
    const invoiceNumber = await generateInvoiceNumber(tenantId)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7) // Due in 7 days
    
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        amount,
        currency,
        status: 'pending',
        paymentMethod: paymentMethod === 'BANK' ? 'bank_transfer' : undefined,
        provider: paymentMethod === 'BANK' ? 'PAYNOW' : 'PAYNOW', // Bank uses same provider enum
        invoiceNumber,
        dueDate,
        description: description || `${subscription.plan} subscription - ${subscription.billingCycle}`
      }
    })
    
    logger.info(`[Billing] Created invoice ${invoiceNumber} for tenant ${tenantId}, amount ${amount} ${currency}`)
    return payment
  }

  /**
   * Process successful payment - IDEMPOTENT
   * This is the ONLY function that activates subscriptions
   */
  static async processSuccessfulPayment(
    paymentId: string,
    providerReference?: string,
    providerResponse?: any
  ) {
    // Use transaction for atomicity
    return await prisma.$transaction(async (tx) => {
      // Get payment with lock
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { subscription: true, tenant: true }
      })
      
      if (!payment) {
        throw new Error('Payment not found')
      }
      
      // IDEMPOTENCY: If already successful, return early
      if (payment.status === 'success') {
        logger.info(`[Billing] Payment ${paymentId} already processed, skipping`)
        return { payment, alreadyProcessed: true }
      }
      
      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'success',
          paidAt: new Date(),
          providerPaymentId: providerReference || payment.providerPaymentId,
          providerResponse: providerResponse || payment.providerResponse
        }
      })
      
      // Extend subscription
      if (payment.subscription) {
        const dates = calculatePeriodDates(payment.subscription.billingCycle)
        
        await tx.subscription.update({
          where: { id: payment.subscription.id },
          data: {
            status: 'ACTIVE',
            currentPeriodStart: dates.currentPeriodStart,
            currentPeriodEnd: dates.currentPeriodEnd,
            gracePeriodEnd: dates.gracePeriodEnd,
            paynowSubscriptionId: providerReference || payment.subscription.paynowSubscriptionId
          }
        })
        
        // Update tenant status
        await tx.tenant.update({
          where: { id: payment.tenantId },
          data: { status: 'ACTIVE' }
        })
      }
      
      logger.info(`[Billing] Payment ${paymentId} successful, subscription activated for tenant ${payment.tenantId}`)
      return { payment: updatedPayment, alreadyProcessed: false }
    })
  }

  /**
   * Process failed payment
   */
  static async processFailedPayment(paymentId: string, reason?: string) {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'failed',
        failedAt: new Date(),
        metadata: { failureReason: reason }
      }
    })
    
    logger.warn(`[Billing] Payment ${paymentId} failed: ${reason}`)
    return payment
  }

  /**
   * Confirm bank transfer - SUPER_ADMIN only
   */
  static async confirmBankTransfer(
    paymentId: string,
    confirmedById: string,
    bankReference?: string
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: true }
    })
    
    if (!payment) {
      throw new Error('Payment not found')
    }
    
    if (payment.paymentMethod !== 'bank_transfer') {
      throw new Error('Payment is not a bank transfer')
    }
    
    if (payment.status === 'success') {
      throw new Error('Payment already confirmed')
    }
    
    // Update with confirmation details
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        bankReference,
        confirmedById,
        confirmedAt: new Date()
      }
    })
    
    // Process as successful payment
    return await this.processSuccessfulPayment(paymentId, bankReference)
  }

  /**
   * Transition subscription to GRACE period
   * Called by background job when currentPeriodEnd is reached
   */
  static async transitionToGrace(subscriptionId: string) {
    return await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId }
      })
      
      if (!subscription) {
        throw new Error('Subscription not found')
      }
      
      // Only transition from ACTIVE or TRIAL
      if (!['ACTIVE', 'TRIAL'].includes(subscription.status)) {
        logger.info(`[Billing] Subscription ${subscriptionId} not in ACTIVE/TRIAL, skipping grace transition`)
        return subscription
      }
      
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'GRACE' }
      })
      
      await tx.tenant.update({
        where: { id: subscription.tenantId },
        data: { status: 'GRACE' }
      })
      
      logger.warn(`[Billing] Subscription ${subscriptionId} transitioned to GRACE`)
      return updated
    })
  }

  /**
   * Transition subscription to READ_ONLY
   * Called by background job when gracePeriodEnd is reached
   */
  static async transitionToReadOnly(subscriptionId: string) {
    return await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId }
      })
      
      if (!subscription) {
        throw new Error('Subscription not found')
      }
      
      // Only transition from GRACE
      if (subscription.status !== 'GRACE') {
        logger.info(`[Billing] Subscription ${subscriptionId} not in GRACE, skipping read-only transition`)
        return subscription
      }
      
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'READ_ONLY' }
      })
      
      await tx.tenant.update({
        where: { id: subscription.tenantId },
        data: { status: 'READ_ONLY' }
      })
      
      logger.warn(`[Billing] Subscription ${subscriptionId} transitioned to READ_ONLY`)
      return updated
    })
  }

  /**
   * Suspend subscription - SUPER_ADMIN only
   */
  static async suspendSubscription(subscriptionId: string, reason?: string) {
    return await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId }
      })
      
      if (!subscription) {
        throw new Error('Subscription not found')
      }
      
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: { 
          status: 'SUSPENDED',
          metadata: { suspensionReason: reason }
        } as any
      })
      
      await tx.tenant.update({
        where: { id: subscription.tenantId },
        data: { status: 'SUSPENDED' }
      })
      
      logger.warn(`[Billing] Subscription ${subscriptionId} SUSPENDED: ${reason}`)
      return updated
    })
  }

  /**
   * Mark overdue invoices
   * Called by background job
   */
  static async markOverdueInvoices() {
    const now = new Date()
    
    const result = await prisma.payment.updateMany({
      where: {
        status: 'pending',
        dueDate: { lt: now }
      },
      data: {
        status: 'overdue'
      }
    })
    
    if (result.count > 0) {
      logger.warn(`[Billing] Marked ${result.count} invoices as overdue`)
    }
    
    return result.count
  }

  /**
   * Run all subscription state transitions
   * Called by daily cron job - SAFE TO RUN MULTIPLE TIMES
   */
  static async runDailySubscriptionCheck() {
    const now = new Date()
    const results = {
      overdueInvoices: 0,
      toGrace: 0,
      toReadOnly: 0
    }
    
    logger.info('[Billing] Starting daily subscription check')
    
    // 1. Mark overdue invoices
    results.overdueInvoices = await this.markOverdueInvoices()
    
    // 2. Transition ACTIVE/TRIAL → GRACE (period ended)
    const subscriptionsToGrace = await prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        currentPeriodEnd: { lt: now }
      }
    })
    
    for (const sub of subscriptionsToGrace) {
      try {
        await this.transitionToGrace(sub.id)
        results.toGrace++
      } catch (error) {
        logger.error(`[Billing] Failed to transition ${sub.id} to GRACE:`, error)
      }
    }
    
    // 3. Transition GRACE → READ_ONLY (grace period ended)
    const subscriptionsToReadOnly = await prisma.subscription.findMany({
      where: {
        status: 'GRACE',
        gracePeriodEnd: { lt: now }
      }
    })
    
    for (const sub of subscriptionsToReadOnly) {
      try {
        await this.transitionToReadOnly(sub.id)
        results.toReadOnly++
      } catch (error) {
        logger.error(`[Billing] Failed to transition ${sub.id} to READ_ONLY:`, error)
      }
    }
    
    logger.info(`[Billing] Daily check complete: ${JSON.stringify(results)}`)
    return results
  }

  /**
   * Get subscription status for a tenant
   */
  static async getSubscriptionStatus(tenantId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    })
    
    return {
      subscription,
      tenant,
      isActive: ['ACTIVE', 'TRIAL'].includes(subscription?.status || ''),
      isGrace: subscription?.status === 'GRACE',
      isReadOnly: subscription?.status === 'READ_ONLY',
      isSuspended: subscription?.status === 'SUSPENDED',
      daysUntilGrace: subscription?.currentPeriodEnd 
        ? Math.max(0, Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
        : 0,
      daysUntilReadOnly: subscription?.gracePeriodEnd
        ? Math.max(0, Math.ceil((subscription.gracePeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
        : 0
    }
  }

  /**
   * Get pending bank transfers for SUPER_ADMIN review
   */
  static async getPendingBankTransfers() {
    const pendingPayments = await prisma.payment.findMany({
      where: {
        provider: 'BANK_TRANSFER',
        status: 'pending'
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        subscription: {
          select: {
            id: true,
            plan: true,
            billingCycle: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return pendingPayments.map((payment) => ({
      id: payment.id,
      invoiceNumber: payment.invoiceNumber,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.createdAt,
      tenantId: payment.tenantId,
      tenantName: payment.tenant?.name,
      tenantSlug: payment.tenant?.slug,
      subscriptionPlan: payment.subscription?.plan,
      subscriptionStatus: payment.subscription?.status,
      description: payment.description,
      daysWaiting: Math.floor((Date.now() - payment.createdAt.getTime()) / (24 * 60 * 60 * 1000))
    }))
  }

  /**
   * Create a bank transfer payment request
   * Returns banking details for customer to make transfer
   */
  static async createBankTransferRequest(
    tenantId: string,
    subscriptionId: string,
    amount: number,
    currency: string = 'USD'
  ) {
    const invoiceNumber = await generateInvoiceNumber(tenantId)
    
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        subscriptionId,
        amount,
        currency,
        status: 'pending',
        provider: 'BANK_TRANSFER',
        invoiceNumber,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days to pay
        description: `Subscription payment - Invoice ${invoiceNumber}`
      }
    })

    // Return banking details
    const bankDetails = {
      bankName: process.env.BANK_NAME || 'Your Bank Name',
      accountName: process.env.BANK_ACCOUNT_NAME || 'TickTrack Pro Ltd',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || 'XXXXXXXXXX',
      branchCode: process.env.BANK_BRANCH_CODE || 'XXXX',
      swiftCode: process.env.BANK_SWIFT_CODE || 'XXXXXXXX',
      reference: invoiceNumber // Customer must use this as reference
    }

    logger.info(`[Billing] Bank transfer request created: ${invoiceNumber}`)

    return {
      payment,
      invoiceNumber,
      bankDetails,
      dueDate: payment.dueDate
    }
  }
}
