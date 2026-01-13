import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { sendSMS } from '@/lib/africastalking-service'
import { logger } from '@/lib/logger'
import { randomBytes } from 'crypto'

/**
 * POST /api/auth/send-otp
 * Sends OTP via email or SMS for password reset
 */
export async function POST(request: NextRequest) {
  try {
    const { email, method, phone } = await request.json()

    if (!email || !method) {
      return NextResponse.json(
        { message: 'Email and method are required' },
        { status: 400 }
      )
    }

    if (method === 'sms' && !phone) {
      return NextResponse.json(
        { message: 'Phone number is required for SMS' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Don't reveal if email exists (security)
      return NextResponse.json(
        { message: 'If an account exists, OTP will be sent' },
        { status: 200 }
      )
    }

    // Generate 6-digit OTP
    const otp = randomBytes(3).readUIntBE(0, 3) % 1000000
    const otpString = String(otp).padStart(6, '0')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Save OTP to database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: otpString,
        type: 'OTP',
        method: method as 'email' | 'sms',
        phone: method === 'sms' ? phone : null,
        expiresAt
      }
    })

    // Send OTP
    if (method === 'email') {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a365d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
            .otp { font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; background: #e0e7ff; padding: 20px; border-radius: 8px; margin: 20px 0; color: #4f46e5; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Password Reset</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">TickTrack Pro</p>
            </div>
            
            <div class="content">
              <p>Hello ${user.name || 'there'},</p>
              <p>You requested to reset your password. Use the code below to proceed:</p>
              
              <div class="otp">${otpString}</div>
              
              <p>This code will expire in 10 minutes.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                If you didn't request this, please ignore this email. Your account is secure.
              </div>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
              <p>This is an automated message, please do not reply directly.</p>
            </div>
          </div>
        </body>
        </html>
      `

      await sendPasswordResetEmail(email, user.name || email, otpString, 'TickTrack Pro')
      logger.info(`OTP sent via email to: ${email}`)
    } else if (method === 'sms') {
      const message = `Your TickTrack Pro password reset code is: ${otpString}. This code expires in 10 minutes.`
      const result = await sendSMS(phone, message)

      if (!result.success || !result.results[0]?.success) {
        const error = result.results[0]?.error || 'Unknown error'
        logger.error(`Failed to send SMS to ${phone}: ${error}`)
        return NextResponse.json(
          { message: 'Failed to send SMS. Please try email instead.' },
          { status: 500 }
        )
      }
      logger.info(`OTP sent via SMS to: ${phone}`)
    }

    return NextResponse.json(
      { message: `OTP sent via ${method}` },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Send OTP error:', error)
    return NextResponse.json(
      { message: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    )
  }
}
