import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import PaynowService from '@/lib/paynow-service'
import { BillingService } from '@/lib/billing-service'
import { logger } from '@/lib/logger'

/**
 * PAYNOW WEBHOOK HANDLER
 * =======================
 * Receives payment notifications from Paynow.
 * 
 * CRITICAL RULES:
 * - This is the SOURCE OF TRUTH for payment status
 * - Must be IDEMPOTENT (same reference may arrive multiple times)
 * - Frontend redirects must NOT activate subscriptions
 * - Uses BillingService as single point for subscription changes
 */

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  logger.info(`[Webhook:${requestId}] Received Paynow webhook`)
  
  try {
    const webhookData = await request.formData()
    
    // Convert FormData to object
    const data: Record<string, string> = {}
    for (const [key, value] of webhookData.entries()) {
      data[key] = value.toString()
    }
    
    logger.info(`[Webhook:${requestId}] Data: ${JSON.stringify(data)}`)

    // Process and verify the webhook
    const processedData = await PaynowService.processWebhook(data)

    if (!processedData.verified) {
      logger.error(`[Webhook:${requestId}] Invalid webhook signature`)
      return NextResponse.json(
        { message: 'Invalid webhook signature' },
        { status: 400 }
      )
    }

    // Extract tenant ID from reference
    // Format: TENANT-{tenantId}-{timestamp} or SUB-{tenantId}-{timestamp}
    const referenceMatch = processedData.reference.match(/(?:TENANT|SUB)-([^-]+)/)
    if (!referenceMatch) {
      logger.error(`[Webhook:${requestId}] Invalid reference format: ${processedData.reference}`)
      return NextResponse.json(
        { message: 'Invalid payment reference' },
        { status: 400 }
      )
    }

    const tenantId = referenceMatch[1]

    // IDEMPOTENCY CHECK: Find existing payment by provider reference
    let payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { providerPaymentId: processedData.paynowReference },
          {
            tenantId,
            providerResponse: {
              path: ['hash'],
              equals: data.hash
            }
          }
        ]
      },
      include: {
        subscription: true
      }
    })

    // If no payment found, look for pending payment for this tenant
    if (!payment) {
      payment = await prisma.payment.findFirst({
        where: {
          tenantId,
          status: 'pending',
          provider: 'PAYNOW'
        },
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: true
        }
      })
    }

    // If still no payment, create one (shouldn't happen normally)
    if (!payment) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { subscription: true }
      })

      if (!tenant) {
        logger.error(`[Webhook:${requestId}] Tenant not found: ${tenantId}`)
        return NextResponse.json(
          { message: 'Tenant not found' },
          { status: 404 }
        )
      }

      payment = await prisma.payment.create({
        data: {
          tenantId,
          subscriptionId: tenant.subscription?.id,
          amount: processedData.amount,
          currency: 'USD',
          status: 'pending',
          provider: 'PAYNOW',
          providerPaymentId: processedData.paynowReference,
          providerResponse: data,
          description: 'Payment received via webhook'
        },
        include: {
          subscription: true
        }
      })
      
      logger.info(`[Webhook:${requestId}] Created payment record: ${payment.id}`)
    }

    // IDEMPOTENCY: Check if already processed successfully
    if (payment.status === 'success') {
      logger.info(`[Webhook:${requestId}] Payment ${payment.id} already processed, returning OK`)
      return NextResponse.json({
        message: 'Payment already processed',
        paymentId: payment.id,
        status: 'success'
      })
    }

    // Update provider response for audit trail
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: processedData.paynowReference,
        providerResponse: data
      }
    })

    // Process based on Paynow status
    const paynowStatus = processedData.status.toLowerCase()
    let result: { status: string; message: string }

    switch (paynowStatus) {
      case 'paid':
      case 'delivered':
        // SUCCESS - Use BillingService to activate subscription
        const successResult = await BillingService.processSuccessfulPayment(
          payment.id,
          processedData.paynowReference,
          data
        )
        result = {
          status: 'success',
          message: successResult.alreadyProcessed 
            ? 'Payment already activated' 
            : 'Payment successful, subscription activated'
        }
        logger.info(`[Webhook:${requestId}] Payment SUCCESS: ${payment.id}`)
        break

      case 'cancelled':
      case 'failed':
        // FAILED
        await BillingService.processFailedPayment(payment.id, `Paynow status: ${paynowStatus}`)
        result = { status: 'failed', message: 'Payment failed' }
        logger.warn(`[Webhook:${requestId}] Payment FAILED: ${payment.id}`)
        break

      case 'created':
      case 'sent':
      case 'pending':
        // Still pending - no action needed
        result = { status: 'pending', message: 'Payment still pending' }
        logger.info(`[Webhook:${requestId}] Payment PENDING: ${payment.id}`)
        break

      default:
        result = { status: paynowStatus, message: `Unknown status: ${paynowStatus}` }
        logger.warn(`[Webhook:${requestId}] Unknown status: ${paynowStatus}`)
    }

    return NextResponse.json({
      message: result.message,
      paymentId: payment.id,
      status: result.status,
      requestId
    })

  } catch (error) {
    logger.error(`[Webhook:${requestId}] Processing error:`, error)
    return NextResponse.json(
      { message: 'Webhook processing failed', requestId },
      { status: 500 }
    )
  }
}

// Handle GET requests for webhook verification (if needed)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const challenge = searchParams.get('challenge')
  
  if (challenge) {
    return NextResponse.json({ challenge })
  }
  
  return NextResponse.json({ 
    message: 'Paynow webhook endpoint',
    status: 'active'
  })
}