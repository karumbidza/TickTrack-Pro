import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { BillingService } from '@/lib/billing-service'
import { logger } from '@/lib/logger'

/**
 * BANK TRANSFER CONFIRMATION ENDPOINT
 * ====================================
 * Only SUPER_ADMIN can confirm bank transfers.
 * 
 * POST /api/billing/bank-transfer/confirm
 * Body: {
 *   paymentId: string,
 *   bankReference: string  // Reference from bank statement
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId, sessionClaims } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
    const userId = meta.dbUserId ?? clerkUserId
    const tenantId = meta.tenantId ?? null
    const role = (meta.role as string) ?? 'END_USER'

    // Only SUPER_ADMIN can confirm bank transfers
    if (role !== 'SUPER_ADMIN') {
      logger.warn(`[BankTransfer] Non-admin user ${userId} attempted to confirm transfer`)
      return NextResponse.json(
        { message: 'Only Super Admin can confirm bank transfers' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { paymentId, bankReference } = body

    if (!paymentId || !bankReference) {
      return NextResponse.json(
        { message: 'Missing required fields: paymentId, bankReference' },
        { status: 400 }
      )
    }

    try {
      // Confirm the bank transfer
      const result = await BillingService.confirmBankTransfer(
        paymentId,
        userId,
        bankReference
      )

      return NextResponse.json({
        message: result.alreadyProcessed 
          ? 'Bank transfer was already confirmed' 
          : 'Bank transfer confirmed successfully',
        payment: result.payment
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json(
        { message: errorMessage },
        { status: 400 }
      )
    }

  } catch (error) {
    logger.error('[BankTransfer] Confirmation error:', error)
    return NextResponse.json(
      { message: 'Failed to confirm bank transfer' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/billing/bank-transfer/confirm
 * Returns list of pending bank transfers for SUPER_ADMIN review
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId, sessionClaims } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
    const userId = meta.dbUserId ?? clerkUserId
    const tenantId = meta.tenantId ?? null
    const role = (meta.role as string) ?? 'END_USER'

    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: 'Only Super Admin can view pending transfers' },
        { status: 403 }
      )
    }

    const pendingTransfers = await BillingService.getPendingBankTransfers()

    return NextResponse.json({
      pendingTransfers,
      count: pendingTransfers.length
    })

  } catch (error) {
    logger.error('[BankTransfer] List error:', error)
    return NextResponse.json(
      { message: 'Failed to retrieve pending transfers' },
      { status: 500 }
    )
  }
}
