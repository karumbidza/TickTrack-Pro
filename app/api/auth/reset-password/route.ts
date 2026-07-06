import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { rateLimitCheck } from '@/lib/api-rate-limit'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { z } from 'zod'

const MAX_OTP_ATTEMPTS = 5

// Password validation - requires strong passwords
const passwordSchema = z.string()
  .min(6, 'Password must be at least 6 characters')
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character')

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

/**
 * POST /api/auth/reset-password
 * Resets password after OTP verification
 */
export async function POST(request: NextRequest) {
  // Rate limit: prevent brute force OTP attacks
  const rateLimitResponse = await rateLimitCheck(request, 'auth')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const validatedData = resetPasswordSchema.parse(body)

    const { email, otp, password } = validatedData

    // Generic error used for every failure path below, to avoid revealing
    // whether the email exists or whether the OTP vs. the account was wrong.
    const invalidResponse = NextResponse.json(
      { message: 'Invalid or expired OTP' },
      { status: 400 }
    )

    // Find user (do not disclose existence)
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return invalidResponse
    }

    // Find the active OTP token for this user
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        type: 'OTP',
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Lockout: consume the token once too many wrong guesses have been made.
    if (!resetToken || resetToken.attempts >= MAX_OTP_ATTEMPTS) {
      if (resetToken) {
        await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
      }
      return invalidResponse
    }

    // Constant-work hash comparison against the stored SHA-256 hash.
    const otpHash = createHash('sha256').update(otp).digest('hex')
    if (resetToken.token !== otpHash) {
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { attempts: { increment: 1 } }
      })
      return invalidResponse
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update password and mark email as verified
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          emailVerified: new Date()
        }
      }),
      // Delete used token
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      }),
      // Delete all other reset tokens for this user
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          type: 'OTP'
        }
      })
    ])

    logger.info(`Password reset successfully for user: ${email}`)

    return NextResponse.json(
      { message: 'Password reset successfully. You can now sign in with your new password.' },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => e.message).join(', ')
      return NextResponse.json(
        { message: errorMessages },
        { status: 400 }
      )
    }

    logger.error('Reset password error:', error)
    return NextResponse.json(
      { message: 'Failed to reset password. Please try again.' },
      { status: 500 }
    )
  }
}
