import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BillingService } from '@/lib/billing-service'
import { logger } from '@/lib/logger'
import { Paynow } from 'paynow'

// Initialize Paynow
const paynow = new Paynow(
  process.env.PAYNOW_INTEGRATION_ID!,
  process.env.PAYNOW_INTEGRATION_KEY!
)

/**
 * GET /api/billing/paynow/status
 * Check the status of a payment
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })
    }

    // Get payment record
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: true, tenant: true }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify tenant access
    if (payment.tenantId !== session.user.tenantId && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If already processed, return current status
    if (payment.status === 'success') {
      return NextResponse.json({
        status: 'success',
        paid: true,
        message: 'Payment successful',
        paidAt: payment.paidAt
      })
    }

    if (payment.status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        paid: false,
        message: (payment.metadata as any)?.failureReason || 'Payment failed'
      })
    }

    // Get poll URL from provider response
    const providerResponse = payment.providerResponse as any
    const pollUrl = providerResponse?.pollUrl

    if (!pollUrl) {
      return NextResponse.json({
        status: 'pending',
        paid: false,
        message: 'Awaiting payment confirmation'
      })
    }

    // Poll Paynow for status
    try {
      const paynowStatus = await paynow.pollTransaction(pollUrl)
      
      logger.info(`[Paynow] Status poll result: ${JSON.stringify(paynowStatus)}`)

      if (paynowStatus.paid) {
        // Payment successful - process it
        await BillingService.processSuccessfulPayment(
          payment.id,
          paynowStatus.paynowReference,
          paynowStatus
        )

        return NextResponse.json({
          status: 'success',
          paid: true,
          message: 'Payment successful!',
          paynowReference: paynowStatus.paynowReference
        })
      } else {
        // Check status string
        const statusLower = paynowStatus.status?.toLowerCase() || ''
        
        if (statusLower === 'cancelled' || statusLower === 'refunded') {
          // Mark as failed
          await BillingService.processFailedPayment(payment.id, 'Payment cancelled by user')
          
          return NextResponse.json({
            status: 'cancelled',
            paid: false,
            message: 'Payment was cancelled'
          })
        }
        
        if (statusLower === 'failed' || statusLower === 'error') {
          await BillingService.processFailedPayment(payment.id, 'Payment failed')
          
          return NextResponse.json({
            status: 'failed',
            paid: false,
            message: 'Payment failed. Please try again.'
          })
        }

        // Still pending
        return NextResponse.json({
          status: 'pending',
          paid: false,
          message: 'Awaiting payment confirmation',
          paynowStatus: paynowStatus.status
        })
      }
    } catch (pollError) {
      logger.error('[Paynow] Poll error:', pollError)
      
      // Return pending if poll fails (network issue)
      return NextResponse.json({
        status: 'pending',
        paid: false,
        message: 'Checking payment status...'
      })
    }
  } catch (error) {
    logger.error('[Paynow] Status check error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
