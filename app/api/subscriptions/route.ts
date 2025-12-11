import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, SubscriptionStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'
import PaynowService from '@/lib/paynow-service'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      plan,
      billingCycle = 'monthly',
      currency = 'USD',
      paymentMethod
    } = body

    // Validate plan
    if (!['BASIC', 'PRO', 'ENTERPRISE'].includes(plan)) {
      return NextResponse.json(
        { message: 'Invalid subscription plan' },
        { status: 400 }
      )
    }

    // Get user's tenant
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Get pricing for the selected plan
    const pricing = PaynowService.getSubscriptionPricing()
    const planKey = plan.toLowerCase() as keyof typeof pricing
    const amount = pricing[planKey][billingCycle as 'monthly' | 'yearly'][currency.toLowerCase() as 'usd' | 'zwl']

    // Create or update subscription record
    const subscriptionData = {
      tenantId: user.tenant.id,
      plan,
      status: 'TRIAL' as SubscriptionStatus, // Will be updated to ACTIVE when payment is confirmed
      amount,
      currency,
      billingCycle,
      paymentProvider: 'PAYNOW' as const,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
    }

    let subscription = await prisma.subscription.findUnique({
      where: { tenantId: user.tenant.id }
    })

    if (subscription) {
      subscription = await prisma.subscription.update({
        where: { tenantId: user.tenant.id },
        data: subscriptionData
      })
    } else {
      subscription = await prisma.subscription.create({
        data: subscriptionData
      })
    }

    // Create Paynow payment
    const paynowResponse = await PaynowService.createSubscription({
      tenantId: user.tenant.id,
      plan,
      amount,
      email: user.email,
      phone: user.phone || undefined,
      billingCycle,
      currency
    })

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        tenantId: user.tenant.id,
        subscriptionId: subscription.id,
        amount,
        currency,
        status: 'pending',
        paymentMethod: paymentMethod || 'unknown',
        provider: 'PAYNOW',
        providerResponse: paynowResponse,
        description: `${plan} subscription - ${billingCycle}`
      }
    })

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        amount: subscription.amount,
        billingCycle: subscription.billingCycle
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency
      },
      paynow: {
        redirectUrl: paynowResponse.redirectUrl,
        pollUrl: paynowResponse.pollUrl,
        instructions: paynowResponse.instructions
      }
    })

  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { message: 'Failed to create subscription' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's tenant and subscription
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { 
        tenant: {
          include: {
            subscription: true,
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        }
      }
    })

    if (!user?.tenant) {
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        status: user.tenant.status,
        trialEndsAt: user.tenant.trialEndsAt
      },
      subscription: user.tenant.subscription,
      recentPayments: user.tenant.payments
    })

  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch subscription' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}