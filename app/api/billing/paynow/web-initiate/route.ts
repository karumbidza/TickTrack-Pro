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

// Set URLs for web-based payments
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ticktrackpro.com'
paynow.resultUrl = process.env.PAYNOW_RESULT_URL || `${baseUrl}/api/payments/paynow/webhook`

/**
 * POST /api/billing/paynow/web-initiate
 * Initiates a web-based payment via Paynow (for InnBucks, ZIPIT, Visa, Mastercard)
 * User is redirected to Paynow to complete the payment
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
      method = 'visa',  // visa, mastercard, zimswitch, innbucks, zipit
      mode = 'upgrade',    // upgrade, advance, renew
      advanceMonths = 1,   // Number of months for advance payment
      description
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

    // Create the subscription if it doesn't exist
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
    
    // Build invoice description based on mode
    let invoiceDescription = description
    if (!invoiceDescription) {
      if (mode === 'advance') {
        invoiceDescription = `${plan} Plan - Pre-payment for ${advanceMonths} months`
      } else if (mode === 'renew') {
        invoiceDescription = `${plan} Plan - Early renewal`
      } else {
        invoiceDescription = `${plan} Plan - ${billingCycle} subscription`
      }
    }
    
    if (!existingPayment) {
      // Create invoice/payment record only if doesn't exist
      try {
        payment = await BillingService.createInvoice(
          tenant.id,
          paymentAmount,
          currency,
          'PAYNOW',
          invoiceDescription,
          { mode, advanceMonths: mode === 'advance' ? advanceMonths : undefined } as any
        )
      } catch (invoiceError: any) {
        // Handle unique constraint error - likely a duplicate invoice number from concurrent requests
        if (invoiceError?.code === 'P2002' && invoiceError?.meta?.target?.includes('invoiceNumber')) {
          logger.warn(`[Paynow Web] Duplicate invoice number, checking for existing payment...`, invoiceError.message)
          
          // Try to find an existing pending payment for this tenant within last 5 minutes
          const recentPayment = await prisma.payment.findFirst({
            where: {
              tenantId: tenant.id,
              provider: 'PAYNOW',
              status: 'pending',
              createdAt: {
                gte: new Date(Date.now() - 300000) // Within last 5 minutes
              }
            },
            orderBy: { createdAt: 'desc' }
          })
          
          if (recentPayment) {
            payment = recentPayment
            logger.info(`[Paynow Web] Using existing pending payment: ${recentPayment.id}`)
          } else {
            return NextResponse.json({ 
              error: 'Failed to create payment record. Please try again.' 
            }, { status: 500 })
          }
        } else {
          throw invoiceError
        }
      }
    }

    if (!payment) {
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
    }

    // Set dynamic return URL with the payment reference
    paynow.returnUrl = `${baseUrl}/billing/payment/return?reference=${reference}&paymentId=${payment.id}`

    // Create Paynow payment for web-based flow
    const paymentEmail = process.env.PAYNOW_MERCHANT_EMAIL || session.user.email!
    const paynowPayment = paynow.createPayment(reference, paymentEmail)
    paynowPayment.add(`TickTrack Pro ${plan} - ${billingCycle}`, paymentAmount)

    logger.info(`[Paynow Web] Initiating web payment for tenant ${tenant.id}, method ${method}, amount ${paymentAmount} ${currency}`)

    // Send web-based payment request (redirects user to Paynow)
    let response
    try {
      response = await paynow.send(paynowPayment)
    } catch (sendError) {
      logger.error('[Paynow Web] Send error:', sendError)
      
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
      // Update payment with Paynow reference and redirect URL
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerResponse: {
            pollUrl: response.pollUrl,
            redirectUrl: response.redirectUrl,
            hash: response.hash,
            reference,
            method,
            webPayment: true
          }
        }
      })

      logger.info(`[Paynow Web] Payment initiated successfully, redirectUrl: ${response.redirectUrl}`)

      // Return the redirect URL for the client to navigate to
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        redirectUrl: response.redirectUrl,
        pollUrl: response.pollUrl,
        reference,
        instructions: `You will be redirected to Paynow to complete your payment using ${getMethodName(method)}.`
      })
    } else {
      // Payment initiation failed
      logger.error(`[Paynow Web] Payment initiation failed: ${response.error}`)
      
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
    logger.error('[Paynow Web] Initiate payment error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

function getMethodName(method: string): string {
  const names: Record<string, string> = {
    'visa': 'Visa',
    'mastercard': 'Mastercard',
    'zimswitch': 'ZimSwitch',
    'innbucks': 'InnBucks',
    'zipit': 'ZIPIT'
  }
  return names[method] || method
}
