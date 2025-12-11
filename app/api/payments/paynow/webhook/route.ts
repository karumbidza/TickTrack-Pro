import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import PaynowService from '@/lib/paynow-service'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.formData()
    
    // Convert FormData to object
    const data: Record<string, string> = {}
    for (const [key, value] of webhookData.entries()) {
      data[key] = value.toString()
    }

    // Process the webhook
    const processedData = await PaynowService.processWebhook(data)

    if (!processedData.verified) {
      return NextResponse.json(
        { message: 'Invalid webhook signature' },
        { status: 400 }
      )
    }

    // Extract tenant ID from reference
    const referenceMatch = processedData.reference.match(/(?:TENANT|SUB)-([^-]+)/)
    if (!referenceMatch) {
      logger.error('Invalid payment reference format:', processedData.reference)
      return NextResponse.json(
        { message: 'Invalid payment reference' },
        { status: 400 }
      )
    }

    const tenantId = referenceMatch[1]

    // Find the payment record
    let payment = await prisma.payment.findFirst({
      where: {
        tenantId,
        OR: [
          { providerPaymentId: processedData.paynowReference },
          { 
            providerResponse: {
              path: ['hash'],
              equals: processedData.reference
            }
          }
        ]
      },
      include: {
        tenant: true,
        subscription: true
      }
    })

    if (!payment) {
      // Create a new payment record if not found
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { subscription: true }
      })

      if (!tenant) {
        logger.error('Tenant not found for payment:', tenantId)
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
          currency: 'USD', // Default, should be determined from the payment
          status: 'pending',
          provider: 'PAYNOW',
          providerPaymentId: processedData.paynowReference,
          description: 'Payment received via webhook'
        },
        include: {
          tenant: true,
          subscription: true
        }
      })
    }

    // Update payment status based on Paynow status
    let paymentStatus = 'pending'
    let paidAt: Date | null = null

    switch (processedData.status.toLowerCase()) {
      case 'paid':
      case 'delivered':
        paymentStatus = 'success'
        paidAt = new Date()
        break
      case 'cancelled':
      case 'failed':
        paymentStatus = 'failed'
        break
      case 'created':
      case 'sent':
        paymentStatus = 'pending'
        break
      default:
        paymentStatus = processedData.status.toLowerCase()
    }

    // Update the payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        providerPaymentId: processedData.paynowReference,
        paidAt,
        updatedAt: new Date()
      }
    })

    // If payment is successful and it's for a subscription, activate the subscription
    if (paymentStatus === 'success' && payment.subscription) {
      await prisma.$transaction(async (tx) => {
        // Update subscription status
        await tx.subscription.update({
          where: { id: payment.subscription!.id },
          data: {
            status: 'ACTIVE',
            paynowSubscriptionId: processedData.paynowReference,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + (
                payment.subscription!.billingCycle === 'yearly' ? 365 : 30
              ) * 24 * 60 * 60 * 1000
            )
          }
        })

        // Update tenant status
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            status: 'ACTIVE'
          }
        })
      })

      // TODO: Send confirmation email to customer
      // await sendSubscriptionConfirmation(payment.tenant.email, payment.subscription)

      console.log(`Subscription activated for tenant ${tenantId} - Plan: ${payment.subscription.plan}`)
    }

    // TODO: Send payment confirmation email
    // await sendPaymentConfirmation(payment.tenant.email, updatedPayment)

    console.log(`Payment webhook processed: ${processedData.paynowReference} - Status: ${paymentStatus}`)

    return NextResponse.json({
      message: 'Webhook processed successfully',
      paymentId: payment.id,
      status: paymentStatus
    })

  } catch (error) {
    console.error('Paynow webhook processing error:', error)
    return NextResponse.json(
      { message: 'Webhook processing failed' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Handle GET requests for webhook verification (if needed)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const challenge = searchParams.get('challenge')
  
  if (challenge) {
    return NextResponse.json({ challenge })
  }
  
  return NextResponse.json({ message: 'Paynow webhook endpoint' })
}