import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'
import { z } from 'zod'

const approveUserSchema = z.object({
  role: z.enum([
    'TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN',
    'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN', 'END_USER'
  ]),
  branchIds: z.array(z.string()).min(1, 'At least one branch/site must be assigned'),
  department: z.string().optional()
})

// GET - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role: true,
        department: true,
        createdAt: true,
        tenantId: true,
        invitedBy: {
          select: { id: true, name: true, email: true }
        },
        branches: {
          include: { branch: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify tenant access
    if (session.user.role !== 'SUPER_ADMIN' && user.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ user })

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// POST - Approve user and assign role/branches
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = approveUserSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { tenant: { select: { name: true } } }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify tenant access
    if (session.user.role !== 'SUPER_ADMIN' && user.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (user.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: 'User is not pending approval' },
        { status: 400 }
      )
    }

    // Generate activation token for email verification + password setup
    const activationToken = crypto.randomBytes(32).toString('hex')
    const activationExpires = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours

    // Update user and assign branches
    const result = await prisma.$transaction(async (tx) => {
      // Remove existing branch assignments
      await tx.userBranch.deleteMany({
        where: { userId: params.id }
      })

      // Create new branch assignments
      await tx.userBranch.createMany({
        data: validatedData.branchIds.map(branchId => ({
          userId: params.id,
          branchId
        }))
      })

      // Update user status and details
      const updatedUser = await tx.user.update({
        where: { id: params.id },
        data: {
          status: 'APPROVED_EMAIL_PENDING',
          role: validatedData.role,
          department: validatedData.department || null,
          approvedById: session.user.id,
          approvedAt: new Date(),
          activationToken,
          activationExpires
        },
        include: {
          branches: {
            include: { branch: true }
          }
        }
      })

      return updatedUser
    })

    // Send activation email
    const activationLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/activate-account/${activationToken}`
    
    // Get branch names for the email
    const branchNames = result.branches.map(ub => ub.branch.name)
    const branchListHtml = branchNames.map(name => `<li style="padding: 4px 0;">${name}</li>`).join('')
    
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
            .info-box { background: #f0fdf4; padding: 20px; margin: 20px 0; border-radius: 12px; border: 2px solid #10b981; }
            .role-badge { display: inline-block; background: #3b82f6; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; }
            .sites-list { background: #f8fafc; padding: 15px 15px 15px 35px; border-radius: 8px; margin: 15px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 15px 0; }
            .footer { text-align: center; padding: 25px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Account Approved!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Welcome to ${user.tenant?.name}</p>
            </div>
            
            <div class="content">
              <p>Hi <strong>${user.name}</strong>,</p>
              <p>Great news! Your account has been <strong style="color: #10b981;">approved</strong> and you're ready to get started.</p>
              
              <div class="info-box">
                <h3 style="margin: 0 0 15px 0; color: #059669;">Your Account Details</h3>
                
                <p style="margin: 10px 0;">
                  <strong>Role:</strong> <span class="role-badge">${validatedData.role.replace(/_/g, ' ')}</span>
                </p>
                
                <p style="margin: 15px 0 5px 0;"><strong>Assigned Site${branchNames.length > 1 ? 's' : ''}:</strong></p>
                <ul class="sites-list">
                  ${branchListHtml}
                </ul>
              </div>
              
              <p>To complete your account setup and set your password, click the button below:</p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${activationLink}" class="button" style="color: white;">Activate My Account →</a>
              </div>
              
              <p style="color: #666; font-size: 14px; background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                ⚠️ This activation link will expire in <strong>72 hours</strong>.
              </p>
              
              <p style="margin-top: 25px;">Welcome to the team!</p>
              <p><strong>The ${user.tenant?.name} Team</strong></p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
              <p style="margin-top: 10px; font-size: 11px;">
                If you didn't request this account, please ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
      await sendEmail(
        user.email,
        `✅ Account Approved - Welcome to ${user.tenant?.name}!`,
        emailHtml
      )
      console.log(`✅ Activation email sent to ${user.email}`)
    } catch (emailError) {
      console.error('Failed to send activation email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'User approved successfully. Activation email sent.',
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role,
        status: result.status,
        branches: result.branches.map(ub => ({
          id: ub.branch.id,
          name: ub.branch.name
        }))
      }
    })

  } catch (error) {
    console.error('Error approving user:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to approve user' },
      { status: 500 }
    )
  }
}

// DELETE - Reject/delete pending user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { tenant: { select: { name: true } } }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify tenant access
    if (session.user.role !== 'SUPER_ADMIN' && user.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (user.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: 'Only pending users can be rejected' },
        { status: 400 }
      )
    }

    // Delete the user and associated invitation link
    await prisma.$transaction(async (tx) => {
      // Update invitation status if exists
      await tx.userInvitation.updateMany({
        where: { userId: params.id },
        data: { userId: null }
      })

      // Delete user
      await tx.user.delete({
        where: { id: params.id }
      })
    })

    // Send rejection email
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Account Request Not Approved</h2>
          <p>Hi ${user.name},</p>
          <p>We regret to inform you that your account request at <strong>${user.tenant?.name}</strong> was not approved.</p>
          <p>If you believe this was a mistake, please contact the administrator.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            TickTrack Pro - Ticket & Asset Management System
          </p>
        </div>
      `
      await sendEmail(
        user.email,
        `Account request at ${user.tenant?.name}`,
        emailHtml
      )
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'User request rejected'
    })

  } catch (error) {
    console.error('Error rejecting user:', error)
    return NextResponse.json(
      { error: 'Failed to reject user' },
      { status: 500 }
    )
  }
}
