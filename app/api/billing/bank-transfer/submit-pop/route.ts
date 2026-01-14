import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BillingService, getSubscriptionPricing } from '@/lib/billing-service'
import { logger } from '@/lib/logger'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

/**
 * POST /api/billing/bank-transfer/submit-pop
 * Submits proof of payment for bank transfer
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const plan = formData.get('plan') as string
    const billingCycle = formData.get('billingCycle') as string
    const currency = formData.get('currency') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 })
    }

    // Validate file
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only images and PDFs are allowed' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      include: { subscription: true }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Calculate amount from plan
    const pricing = getSubscriptionPricing()
    const planKey = plan.toLowerCase() as 'basic' | 'pro' | 'enterprise'
    const cycleKey = billingCycle as 'monthly' | 'yearly'
    const currencyKey = currency.toLowerCase() as 'usd' | 'zwl'
    const paymentAmount = pricing[planKey][cycleKey][currencyKey] || 29

    // Create or update subscription
    let subscription = tenant.subscription
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: plan.toUpperCase() as any,
          status: 'TRIAL',
          amount: paymentAmount,
          currency,
          billingCycle: billingCycle as any,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          gracePeriodEnd: new Date()
        }
      })
    } else {
      subscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          plan: plan.toUpperCase() as any,
          status: 'TRIAL',
          amount: paymentAmount,
          currency,
          billingCycle: billingCycle as any
        }
      })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save file to uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'bank-transfer-pop')
    await mkdir(uploadsDir, { recursive: true })

    const filename = `${tenant.id}-${subscription.id}-${Date.now()}.${file.name.split('.').pop()}`
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    // Create payment record with POP
    const payment = await BillingService.createInvoice(
      tenant.id,
      paymentAmount,
      currency,
      'BANK',
      `${plan} Plan - ${billingCycle} subscription (Pending Admin Review)`
    )

    // Update payment with POP file reference
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'pending_approval',
        metadata: {
          popFile: `/uploads/bank-transfer-pop/${filename}`,
          popSubmittedAt: new Date().toISOString(),
          submittedByUserId: session.user.id
        }
      }
    })

    logger.info(`[Bank Transfer] POP submitted for tenant ${tenant.id}, plan ${plan}, awaiting admin review`)

    return NextResponse.json({
      success: true,
      message: 'Payment proof submitted successfully. Admin will review and activate your account soon.',
      subscriptionId: subscription.id,
      paymentId: payment.id
    })
  } catch (error) {
    logger.error('[Bank Transfer] POP submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit payment proof' },
      { status: 500 }
    )
  }
}
