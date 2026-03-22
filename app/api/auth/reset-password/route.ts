import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { rateLimitCheck } from '@/lib/api-rate-limit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Find and validate OTP token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token: otp,
        type: 'OTP',
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (!resetToken) {
      return NextResponse.json(
        { message: 'Invalid or expired OTP' },
        { status: 400 }
      )
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
