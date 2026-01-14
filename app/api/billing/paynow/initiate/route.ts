import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BillingService, getSubscriptionPricing } from '@/lib/billing-service'
import { logger } from '@/lib/logger'
import { Paynow } from 'paynow'

// Initialize Paynow
const paynow = new Paynow(
  process.env.PAYNOW_INTEGRATION_ID!,
  process.env.PAYNOW_INTEGRATION_KEY!
)

paynow.returnUrl = process.env.PAYNOW_RETURN_URL || `${process.env.NEXT_PUBLIC_APP_URL}/billing/payment/return`
paynow.resultUrl = process.env.PAYNOW_RESULT_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paynow/webhook`

/**
 * POST /api/billing/paynow/initiate
 * Initiates a mobile money payment via Paynow
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only tenant admins can initiate payments
    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const body = await request.json()
    const { 
      plan = 'BASIC', 
      billingCycle = 'monthly', 
      amount, 
      currency = 'USD'
    } = body

    // Get tenant and subscription
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      include: { subscription: true }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Calculate amount from plan if not provided
    let paymentAmount = amount
    if (!paymentAmount) {
      const pricing = getSubscriptionPricing()
      const planKey = plan.toLowerCase() as 'basic' | 'pro' | 'enterprise'
      const cycleKey = billingCycle as 'monthly' | 'yearly'
      const currencyKey = currency.toLowerCase() as 'usd' | 'zwl'
      paymentAmount = pricing[planKey][cycleKey][currencyKey] || 29
    }

    // Create the subscription if it doesn't exist or update it
    let subscription = tenant.subscription
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: plan.toUpperCase() as any,
          status: 'TRIAL',
          amount: paymentAmount,
          currency,
          billingCycle,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          gracePeriodEnd: new Date()
        }
      })
    }

    // Create payment reference (unique per request)
    const reference = `SUB-${tenant.id.slice(0, 8)}-${Date.now()}`

    // Check if we already initiated this payment (avoid duplicates)
    const existingPayment = await prisma.payment.findFirst({
      where: {
        tenantId: tenant.id,
        provider: 'PAYNOW',
        status: 'pending',
        createdAt: {
          gte: new Date(Date.now() - 60000) // Within last 60 seconds
        }
      }
    })

    let payment = existingPayment
    
    if (!existingPayment) {
      // Create invoice/payment record only if doesn't exist
      payment = await BillingService.createInvoice(
        tenant.id,
        paymentAmount,
        currency,
        'PAYNOW',
        `${plan} Plan - ${billingCycle} subscription`
      )
    }

    if (!payment) {
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
    }

    // Create Paynow payment
    const paynowPayment = paynow.createPayment(reference, session.user.email!)
    paynowPayment.add(`TickTrack Pro ${plan} - ${billingCycle}`, paymentAmount)

    logger.info(`[Paynow] Initiating web payment for tenant ${tenant.id}, amount ${paymentAmount} ${currency}`)

    // Send web payment request (user redirected to Paynow payment gateway)
    let response
    try {
      response = await paynow.send(paynowPayment)
    } catch (sendError) {
      logger.error('[Paynow] Web send error:', sendError)
      
      // Mark payment as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'failed',
          failedAt: new Date(),
          metadata: { error: 'Failed to connect to Paynow' }
        }
      })
      
      return NextResponse.json({ 
        error: 'Failed to connect to payment provider. Please try again.' 
      }, { status: 500 })
    }

    if (response.success) {
      // Update payment with Paynow reference
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerResponse: {
            redirectUrl: response.redirectUrl,
            pollUrl: response.pollUrl,
            hash: response.hash,
            reference
          }
        }
      })

      logger.info(`[Paynow] Payment initiated successfully, redirectUrl: ${response.redirectUrl}`)

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        redirectUrl: response.redirectUrl,
        pollUrl: response.pollUrl,
        reference
      })
    } else {
      // Payment initiation failed
      logger.error(`[Paynow] Payment initiation failed: ${response.error}`)
      
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'failed',
          failedAt: new Date(),
          metadata: { error: response.error }
        }
      })

      return NextResponse.json({ 
        error: response.error || 'Payment initiation failed' 
      }, { status: 400 })
    }
  } catch (error) {
    logger.error('[Paynow] Initiate payment error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
