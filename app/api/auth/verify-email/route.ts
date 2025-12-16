import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'
import crypto from 'crypto'

// GET - Verify email with token
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin?error=invalid_token', request.url))
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    })

    if (!verificationToken) {
      return NextResponse.redirect(new URL('/auth/signin?error=invalid_token', request.url))
    }

    // Check if token is expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: { token }
      })
      return NextResponse.redirect(new URL('/auth/signin?error=token_expired', request.url))
    }

    // Find the user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier }
    })

    if (!user) {
      return NextResponse.redirect(new URL('/auth/signin?error=user_not_found', request.url))
    }

    // Update user's emailVerified field
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() }
    })

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { token }
    })

    // Redirect to success page
    return NextResponse.redirect(new URL('/auth/signin?verified=true', request.url))
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(new URL('/auth/signin?error=verification_failed', request.url))
  }
}

// POST - Send/resend verification email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ message: 'If an account exists, a verification email has been sent' })
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: 'Email is already verified' })
    }

    // Delete any existing tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: email }
    })

    // Generate new verification token
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires
      }
    })

    // Send verification email
    const verificationLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${token}`
    await sendVerificationEmail(email, user.name || 'User', verificationLink)

    return NextResponse.json({ message: 'Verification email sent successfully' })
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
  }
}
