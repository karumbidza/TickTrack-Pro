import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/forgot-password
 * Initiates password reset by verifying email exists
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Don't reveal if email exists or not (security best practice)
      return NextResponse.json(
        { message: 'If an account exists with this email, you will receive reset instructions' },
        { status: 200 }
      )
    }

    // Clean up any expired reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: {
          lt: new Date()
        }
      }
    })

    logger.info(`Password reset initiated for user: ${email}`)

    return NextResponse.json(
      { message: 'If an account exists with this email, you will receive reset instructions' },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Forgot password error:', error)
    return NextResponse.json(
      { message: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
