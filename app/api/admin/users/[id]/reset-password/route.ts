import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendPasswordResetEmail } from '@/lib/email'

// Reset password for a user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkUserId, sessionClaims } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
    const sessionUserId = meta.dbUserId ?? clerkUserId
    const tenantId = meta.tenantId ?? null
    const role = (meta.role as string) ?? 'END_USER'
    const userName = meta.userName ?? null

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN', 'SUPER_ADMIN']

    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = params.id
    const { newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // For non-super admins, ensure user belongs to same tenant
    if (role !== 'SUPER_ADMIN') {
      if (user.tenantId !== tenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update the user's password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    // Send password reset email with new credentials (non-blocking)
    const resetByName = userName || 'Administrator'
    sendPasswordResetEmail(
      user.email,
      user.name || user.email,
      newPassword, // Original password before hashing
      resetByName
    ).catch(err => console.error('Failed to send password reset email:', err))

    return NextResponse.json({ success: true, message: 'Password reset successfully. Email sent to user.' })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
