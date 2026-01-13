import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * GET /api/billing/paynow/verify
 * Verify payment status by reference (used by return page)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 })
    }

    // Find payment by reference (extracted from Paynow reference)
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { providerPaymentId: reference },
          {
            providerResponse: {
              path: ['reference'],
              equals: reference
            }
          }
        ]
      },
      include: {
        subscription: true,
        tenant: true
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!payment) {
      logger.warn(`[Paynow] Verify: No payment found for reference ${reference}`)
      return NextResponse.json({
        status: 'unknown',
        message: 'Payment not found. It may take a few moments to process.'
      })
    }

    // Return status based on payment record
    if (payment.status === 'success') {
      return NextResponse.json({
        status: 'success',
        paid: true,
        message: 'Payment successful',
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.paidAt,
        subscriptionStatus: payment.subscription?.status
      })
    }

    if (payment.status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        paid: false,
        message: (payment.metadata as any)?.failureReason || 'Payment failed'
      })
    }

    // Payment is still pending
    return NextResponse.json({
      status: 'pending',
      paid: false,
      message: 'Payment is being processed. Please wait...'
    })
  } catch (error) {
    logger.error('[Paynow] Verify error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
