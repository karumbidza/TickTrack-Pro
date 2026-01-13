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
      currency = 'USD',
      paymentMethod = 'ecocash',
      phone 
    } = body

    // Validate required fields
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Validate phone format (Zimbabwe)
    const normalizedPhone = phone.replace(/\D/g, '')
    if (!normalizedPhone.match(/^263(71|73|77|78)\d{7}$/)) {
      return NextResponse.json({ 
        error: 'Invalid phone number. Please use format: 263XXXXXXXXX' 
      }, { status: 400 })
    }

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
      const planKey = plan.toLowerCase() as keyof typeof pricing
      const currencyKey = currency.toLowerCase() as 'usd' | 'zwl'
      paymentAmount = pricing[planKey]?.[billingCycle]?.[currencyKey] || 29
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

    // Create invoice/payment record
    const payment = await BillingService.createInvoice(
      tenant.id,
      paymentAmount,
      currency,
      'PAYNOW',
      `${plan} Plan - ${billingCycle} subscription`
    )

    // Map payment method to Paynow mobile method
    const mobileMethodMap: Record<string, string> = {
      ecocash: 'ecocash',
      onemoney: 'onemoney',
      innbucks: 'innbucks',
      telecash: 'telecash'
    }
    const paynowMethod = mobileMethodMap[paymentMethod] || 'ecocash'

    // Create payment reference
    const reference = `SUB-${tenant.id.slice(0, 8)}-${Date.now()}`

    // Create Paynow payment
    const paynowPayment = paynow.createPayment(reference, session.user.email!)
    paynowPayment.add(`TickTrack Pro ${plan} - ${billingCycle}`, paymentAmount)

    logger.info(`[Paynow] Initiating ${paynowMethod} payment for tenant ${tenant.id}, amount ${paymentAmount} ${currency}`)

    // Send mobile money payment request
    let response
    try {
      response = await paynow.sendMobile(paynowPayment, normalizedPhone, paynowMethod)
    } catch (sendError) {
      logger.error('[Paynow] Mobile send error:', sendError)
      
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
            pollUrl: response.pollUrl,
            instructions: response.instructions,
            hash: response.hash,
            reference
          }
        }
      })

      logger.info(`[Paynow] Payment initiated successfully, pollUrl: ${response.pollUrl}`)

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        pollUrl: response.pollUrl,
        instructions: response.instructions || getInstructions(paymentMethod),
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

function getInstructions(method: string): string {
  const instructions: Record<string, string> = {
    ecocash: 'Please check your phone for a payment prompt and enter your EcoCash PIN to complete the payment.',
    onemoney: 'Please check your phone for a payment prompt and enter your OneMoney PIN to complete the payment.',
    innbucks: 'Please approve the payment request in your InnBucks app.',
    telecash: 'Please check your phone for a payment prompt and enter your Telecash PIN to complete the payment.'
  }
  return instructions[method] || 'Please check your phone and approve the payment request.'
}
