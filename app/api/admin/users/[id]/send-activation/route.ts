import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

// POST - Send or resend activation email to user
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

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        tenant: { select: { name: true } },
        branches: {
          include: { branch: { select: { name: true } } }
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

    // Generate new activation token
    const activationToken = crypto.randomBytes(32).toString('hex')
    const activationExpires = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours

    // Update user with new token
    await prisma.user.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED_EMAIL_PENDING',
        activationToken,
        activationExpires
      }
    })

    // Build activation email
    const activationLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/activate-account/${activationToken}`
    const branchNames = user.branches.map(ub => ub.branch.name)
    const branchListHtml = branchNames.map(name => `<li style="padding: 4px 0;">${name}</li>`).join('')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🔑 Activate Your Account</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Welcome to ${user.tenant?.name}</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>Your account is ready! Complete your setup by clicking the button below to set your password.</p>
            
            <div style="background: #f0fdf4; padding: 20px; margin: 20px 0; border-radius: 12px; border: 2px solid #10b981;">
              <h3 style="margin: 0 0 15px 0; color: #059669;">Your Account Details</h3>
              
              <p style="margin: 10px 0;">
                <strong>Email:</strong> ${user.email}
              </p>
              
              <p style="margin: 10px 0;">
                <strong>Role:</strong> <span style="display: inline-block; background: #3b82f6; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">${user.role.replace(/_/g, ' ')}</span>
              </p>
              
              ${branchNames.length > 0 ? `
              <p style="margin: 15px 0 5px 0;"><strong>Assigned Site${branchNames.length > 1 ? 's' : ''}:</strong></p>
              <ul style="background: #f8fafc; padding: 15px 15px 15px 35px; border-radius: 8px; margin: 15px 0;">
                ${branchListHtml}
              </ul>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${activationLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Set My Password →</a>
            </div>
            
            <p style="font-size: 13px; color: #666; margin-top: 20px;">
              Or copy and paste this link in your browser:<br>
              <a href="${activationLink}" style="color: #3b82f6; word-break: break-all;">${activationLink}</a>
            </p>
            
            <p style="color: #666; font-size: 14px; background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              ⚠️ This link will expire in <strong>72 hours</strong>.
            </p>
            
            <p style="margin-top: 25px;">See you soon!</p>
            <p><strong>The ${user.tenant?.name} Team</strong></p>
          </div>
          
          <div style="text-align: center; padding: 25px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="margin: 0;">© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send the email
    try {
      console.log(`📧 Attempting to send activation email to ${user.email}...`)
      await sendEmail(
        user.email,
        `🔑 Activate Your Account - ${user.tenant?.name}`,
        emailHtml
      )
      console.log(`✅ Activation email sent successfully to ${user.email}`)
    } catch (emailError) {
      console.error('❌ Failed to send activation email:', emailError)
      // Still return success since the token was generated
      console.log('📧 ACTIVATION LINK (for development):')
      console.log(`   Email: ${user.email}`)
      console.log(`   Link: ${activationLink}`)
      
      return NextResponse.json({
        success: true,
        message: `Token generated but email failed. Check console for link.`,
        activationLink,
        emailError: String(emailError)
      })
    }

    return NextResponse.json({
      success: true,
      message: `Activation email sent to ${user.email}`,
      activationLink // Include for development/debugging
    })

  } catch (error) {
    console.error('Error sending activation email:', error)
    return NextResponse.json(
      { error: 'Failed to send activation email' },
      { status: 500 }
    )
  }
}
