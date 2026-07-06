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

    // Extract tenant ID prefix from reference
    // Format: TENANT-{tenantIdPrefix}-{timestamp} or SUB-{tenantIdPrefix}-{timestamp}
    // Note: tenantIdPrefix is first 8 chars of the full tenant ID
    const referenceMatch = processedData.reference.match(/(?:TENANT|SUB)-([^-]+)/)
    if (!referenceMatch) {
      logger.error(`[Webhook:${requestId}] Invalid reference format: ${processedData.reference}`)
      return NextResponse.json(
        { message: 'Invalid payment reference' },
        { status: 400 }
      )
    }

    const tenantIdPrefix = referenceMatch[1]
    
    // Find tenant by ID prefix (reference only contains first 8 chars)
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: { startsWith: tenantIdPrefix }
      },
      include: { subscription: true }
    })
    
    if (!tenant) {
      logger.error(`[Webhook:${requestId}] Tenant not found with prefix: ${tenantIdPrefix}`)
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      )
    }
    
    const tenantId = tenant.id
    logger.info(`[Webhook:${requestId}] Found tenant: ${tenantId}`)

    // IDENTITY + IDEMPOTENCY: match strictly on the Paynow reference or on the
    // reference we generated at initiate time (stored in providerResponse.reference),
    // scoped to the tenant. We deliberately do NOT fall back to "the most recent
    // pending payment for this tenant" — that could settle an unrelated, larger
    // invoice from a cheaper transaction.
    const payment = await prisma.payment.findFirst({
      where: {
        tenantId,
        OR: [
          { providerPaymentId: processedData.paynowReference },
          { providerResponse: { path: ['reference'], equals: processedData.reference } }
        ]
      },
      include: {
        subscription: true
      }
    })

    if (!payment) {
      logger.error(`[Webhook:${requestId}] No matching payment for reference ${processedData.reference} / ${processedData.paynowReference}`)
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 })
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

    // AMOUNT VERIFICATION: never activate a subscription on an underpayment.
    // Compare what Paynow reports against the amount recorded at initiate time.
    if (paynowStatus === 'paid' || paynowStatus === 'delivered') {
      const expected = payment.amount
      const received = processedData.amount
      if (!Number.isFinite(received) || received + 0.01 < expected) {
        logger.error(`[Webhook:${requestId}] Amount mismatch on ${payment.id}: expected ${expected}, received ${received}`)
        await BillingService.processFailedPayment(payment.id, `Underpayment: expected ${expected}, received ${received}`)
        return NextResponse.json(
          { status: 'rejected', message: 'Amount mismatch', paymentId: payment.id },
          { status: 409 }
        )
      }
    }

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