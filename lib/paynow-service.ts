import { Paynow } from 'paynow'
import { logger } from './logger'

// Initialize Paynow with your integration details
const paynow = new Paynow(
  process.env.PAYNOW_INTEGRATION_ID!,
  process.env.PAYNOW_INTEGRATION_KEY!
)

// Set return and result URLs
paynow.returnUrl = process.env.PAYNOW_RETURN_URL || `${process.env.NEXT_PUBLIC_APP_URL}/billing/payment/return`
paynow.resultUrl = process.env.PAYNOW_RESULT_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paynow/webhook`

export interface PaynowPaymentData {
  tenantId: string
  subscriptionId?: string
  amount: number
  email: string
  phone?: string
  description: string
  currency?: 'USD' | 'ZWL'
}

export interface PaynowSubscriptionData {
  tenantId: string
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE'
  amount: number
  email: string
  phone?: string
  billingCycle: 'monthly' | 'yearly'
  currency?: 'USD' | 'ZWL'
}

export class PaynowService {
  /**
   * Create a one-time payment
   */
  static async createPayment(paymentData: PaynowPaymentData) {
    try {
      const { tenantId, amount, email, phone, description, currency = 'USD' } = paymentData

      // Create the payment
      const payment = paynow.createPayment(`TENANT-${tenantId}-${Date.now()}`, email)
      
      // Add items to the payment
      payment.add(description, amount)

      // Send the payment to Paynow
      const response = await paynow.send(payment)

      if (response.success) {
        return {
          success: true,
          pollUrl: response.pollUrl,
          redirectUrl: response.redirectUrl,
          instructions: response.instructions,
          hash: response.hash
        }
      } else {
        throw new Error(response.error || 'Payment creation failed')
      }
    } catch (error) {
      logger.error('Paynow payment creation error:', error)
      throw new Error('Failed to create payment')
    }
  }

  /**
   * Create a subscription payment
   */
  static async createSubscription(subscriptionData: PaynowSubscriptionData) {
    try {
      const { 
        tenantId, 
        plan, 
        amount, 
        email, 
        phone, 
        billingCycle,
        currency = 'USD' 
      } = subscriptionData

      const description = `TickTrack Pro ${plan} - ${billingCycle} subscription`
      
      // For now, treat subscriptions as regular payments
      // In production, you might want to use recurring payments if Paynow supports them
      const payment = paynow.createPayment(`SUB-${tenantId}-${Date.now()}`, email)
      payment.add(description, amount)

      const response = await paynow.send(payment)

      if (response.success) {
        return {
          success: true,
          pollUrl: response.pollUrl,
          redirectUrl: response.redirectUrl,
          instructions: response.instructions,
          hash: response.hash,
          subscriptionData: {
            plan,
            billingCycle,
            amount,
            currency
          }
        }
      } else {
        throw new Error(response.error || 'Subscription payment creation failed')
      }
    } catch (error) {
      logger.error('Paynow subscription creation error:', error)
      throw new Error('Failed to create subscription payment')
    }
  }

  /**
   * Check payment status
   */
  static async checkPaymentStatus(pollUrl: string) {
    try {
      const status = await paynow.pollTransaction(pollUrl)
      
      return {
        paid: status.paid,
        amount: status.amount,
        reference: status.reference,
        paynowReference: status.paynowReference,
        status: status.status,
        hash: status.hash
      }
    } catch (error) {
      logger.error('Paynow status check error:', error)
      throw new Error('Failed to check payment status')
    }
  }

  /**
   * Process webhook notification
   */
  static async processWebhook(webhookData: any) {
    try {
      const {
        reference,
        paynowreference,
        amount,
        status,
        pollurl,
        hash
      } = webhookData

      // Verify the hash to ensure the webhook is authentic
      const isValid = paynow.verifyHash(webhookData, hash)
      
      if (!isValid) {
        throw new Error('Invalid webhook hash')
      }

      return {
        reference,
        paynowReference: paynowreference,
        amount: parseFloat(amount),
        status,
        pollUrl: pollurl,
        verified: true
      }
    } catch (error) {
      logger.error('Paynow webhook processing error:', error)
      throw new Error('Failed to process webhook')
    }
  }

  /**
   * Get supported payment methods
   */
  static getPaymentMethods() {
    return [
      { id: 'ecocash', name: 'EcoCash', type: 'mobile_money' },
      { id: 'onemoney', name: 'OneMoney', type: 'mobile_money' },
      { id: 'visa', name: 'Visa Card', type: 'card' },
      { id: 'mastercard', name: 'Mastercard', type: 'card' },
      { id: 'zipit', name: 'ZipIt', type: 'mobile_money' }
    ]
  }

  /**
   * Calculate subscription pricing
   */
  static getSubscriptionPricing() {
    return {
      basic: {
        monthly: { usd: 29, zwl: 1160 }, // Approximate ZWL rate
        yearly: { usd: 290, zwl: 11600 }
      },
      pro: {
        monthly: { usd: 79, zwl: 3160 },
        yearly: { usd: 790, zwl: 31600 }
      },
      enterprise: {
        monthly: { usd: 199, zwl: 7960 },
        yearly: { usd: 1990, zwl: 79600 }
      }
    }
  }
}

export default PaynowService