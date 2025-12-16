import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.EMAIL_FROM || 'TickTrack Pro <noreply@ticktrackpro.com>'

interface RatingEmailData {
  contractorEmail: string
  contractorName: string
  ticketNumber: string
  ticketTitle: string
  overallRating: number
  punctualityRating: number
  customerServiceRating: number
  workmanshipRating: number
  ppeCompliant: boolean
  followedSiteProcedures: boolean
  comments: string
}

const getStars = (rating: number): string => {
  const filled = '★'.repeat(Math.max(0, Math.min(5, rating)))
  const empty = '☆'.repeat(5 - Math.max(0, Math.min(5, rating)))
  return filled + empty
}

// Check if email is configured
const isEmailConfigured = (): boolean => {
  return !!process.env.RESEND_API_KEY
}

export async function sendRatingEmailToContractor(data: RatingEmailData): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured (RESEND_API_KEY missing), skipping rating email notification')
    console.log('Rating data that would be sent:', data)
    return
  }

  const overallStatus = data.overallRating >= 4 ? 'Excellent Work!' : 
                        data.overallRating >= 3 ? 'Good Job' : 
                        'Needs Improvement'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .rating-section { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
        .stars { color: #f59e0b; font-size: 20px; }
        .overall { background: ${data.overallRating >= 4 ? '#10b981' : data.overallRating >= 3 ? '#3b82f6' : '#ef4444'}; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 15px 0; }
        .label { font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; margin-top: 5px; }
        .compliance { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
        .compliant { background: #dcfce7; color: #166534; }
        .non-compliant { background: #fee2e2; color: #991b1b; }
        .comments { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Job Rating Received</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Ticket #${data.ticketNumber}</p>
        </div>
        
        <div class="content">
          <p>Dear ${data.contractorName},</p>
          <p>You have received a rating for the following job:</p>
          
          <div class="rating-section">
            <div class="label">Job Title</div>
            <div class="value">${data.ticketTitle}</div>
          </div>
          
          <div class="overall">
            <div style="font-size: 14px; opacity: 0.9;">OVERALL RATING</div>
            <div class="stars" style="font-size: 32px; margin: 10px 0;">${getStars(data.overallRating)}</div>
            <div style="font-size: 24px; font-weight: bold;">${data.overallRating}/5 - ${overallStatus}</div>
          </div>
          
          <div class="rating-section">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                  <div class="label">Punctuality</div>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                  <span class="stars">${getStars(data.punctualityRating)}</span>
                  <span style="margin-left: 10px;">${data.punctualityRating}/5</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                  <div class="label">Customer Service</div>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                  <span class="stars">${getStars(data.customerServiceRating)}</span>
                  <span style="margin-left: 10px;">${data.customerServiceRating}/5</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                  <div class="label">Workmanship</div>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                  <span class="stars">${getStars(data.workmanshipRating)}</span>
                  <span style="margin-left: 10px;">${data.workmanshipRating}/5</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                  <div class="label">PPE Compliance</div>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                  <span class="compliance ${data.ppeCompliant ? 'compliant' : 'non-compliant'}">
                    ${data.ppeCompliant ? '✓ Compliant' : '✗ Non-Compliant'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0;">
                  <div class="label">Site Procedures</div>
                </td>
                <td style="padding: 10px 0; text-align: right;">
                  <span class="compliance ${data.followedSiteProcedures ? 'compliant' : 'non-compliant'}">
                    ${data.followedSiteProcedures ? '✓ Followed' : '✗ Issues Noted'}
                  </span>
                </td>
              </tr>
            </table>
          </div>
          
          ${data.comments ? `
          <div class="comments">
            <div class="label" style="margin-bottom: 5px;">Customer Comments</div>
            <p style="margin: 0;">${data.comments}</p>
          </div>
          ` : ''}
          
          <p style="margin-top: 20px;">
            This rating has been added to your contractor profile and will be visible to administrators.
          </p>
          
          <p>Thank you for your service!</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message from TickTrack Pro</p>
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contractorEmail,
      subject: `Job Rating Received - Ticket #${data.ticketNumber} (${data.overallRating}/5 Stars)`,
      html: htmlContent
    })

    if (error) {
      console.error('Failed to send rating email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log(`Rating email sent to ${data.contractorEmail}`)
  } catch (error) {
    console.error('Error sending rating email:', error)
    throw error
  }
}

// Send email verification email
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationLink: string
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured (RESEND_API_KEY missing), skipping verification email')
    console.log('Verification link that would be sent:', verificationLink)
    return
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #2563eb; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 20px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Verify Your Email</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">TickTrack Pro</p>
        </div>
        
        <div class="content">
          <p>Hello ${name || 'there'},</p>
          <p>Thank you for registering with TickTrack Pro. Please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${verificationLink}" class="button" style="color: white;">Verify Email Address</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 4px; font-size: 14px;">
            ${verificationLink}
          </p>
          
          <div class="warning">
            <strong>⚠️ This link expires in 24 hours.</strong><br>
            If you didn't create an account, you can safely ignore this email.
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

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your email - TickTrack Pro',
      html: htmlContent
    })

    if (error) {
      console.error('Failed to send verification email:', error)
      throw new Error(`Failed to send verification email: ${error.message}`)
    }
    
    console.log('Verification email sent to:', email)
  } catch (error) {
    console.error('Error sending verification email:', error)
    throw error
  }
}

// Generic email sender for other notifications
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured (RESEND_API_KEY missing), skipping email notification')
    return
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html
    })

    if (error) {
      console.error('Failed to send email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

// Send contractor invitation email
export async function sendContractorInvitationEmail(
  email: string,
  companyName: string,
  registrationLink: string,
  tenantName: string,
  expiresAt: Date
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured (RESEND_API_KEY missing), skipping contractor invitation email')
    console.log(`Would send invitation to ${email} with link: ${registrationLink}`)
    return
  }

  const expiryDate = expiresAt.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
        .invite-box { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; margin: 25px 0; border-radius: 12px; border: 2px solid #3b82f6; text-align: center; }
        .invite-box h2 { color: #1a365d; margin: 0 0 10px 0; font-size: 20px; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 15px 0; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4); }
        .button:hover { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); }
        .steps { background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; }
        .step { display: flex; align-items: flex-start; margin: 15px 0; }
        .step-number { background: #3b82f6; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0; margin-right: 15px; }
        .step-content { flex: 1; }
        .step-content strong { color: #1a365d; }
        .expiry-notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-size: 14px; border-radius: 0 8px 8px 0; }
        .footer { text-align: center; padding: 25px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none; }
        .link-text { word-break: break-all; font-size: 12px; color: #64748b; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 You're Invited!</h1>
          <p>Join ${tenantName} as a Service Contractor</p>
        </div>
        
        <div class="content">
          <p>Hello <strong>${companyName}</strong>,</p>
          <p>You have been invited to register as a contractor on <strong>${tenantName}'s</strong> TickTrack Pro platform. This will allow you to receive and manage service tickets, submit invoices, and grow your business with us.</p>
          
          <div class="invite-box">
            <h2>Complete Your Registration</h2>
            <p style="color: #64748b; margin: 0 0 15px 0;">Click the button below to start your KYC registration</p>
            <a href="${registrationLink}" class="button">Register Now →</a>
            <p class="link-text">Or copy this link: ${registrationLink}</p>
          </div>
          
          <div class="steps">
            <h3 style="margin: 0 0 15px 0; color: #1a365d;">📋 Registration Steps</h3>
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <strong>Company Details</strong><br>
                <span style="color: #64748b; font-size: 14px;">Enter your company information and registration details</span>
              </div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <strong>Contact Information</strong><br>
                <span style="color: #64748b; font-size: 14px;">Provide your contact details and representatives</span>
              </div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <strong>Banking & Tax Details</strong><br>
                <span style="color: #64748b; font-size: 14px;">Add your banking information for payments</span>
              </div>
            </div>
            <div class="step">
              <div class="step-number">4</div>
              <div class="step-content">
                <strong>Upload Documents</strong><br>
                <span style="color: #64748b; font-size: 14px;">Submit required certificates and compliance documents</span>
              </div>
            </div>
            <div class="step">
              <div class="step-number">5</div>
              <div class="step-content">
                <strong>Select Service Categories</strong><br>
                <span style="color: #64748b; font-size: 14px;">Choose the categories of work you can provide</span>
              </div>
            </div>
          </div>
          
          <div class="expiry-notice">
            <strong>⏰ Important:</strong> This invitation link will expire on <strong>${expiryDate}</strong>. Please complete your registration before this date.
          </div>
          
          <p>If you have any questions about the registration process, please contact your administrator at ${tenantName}.</p>
          
          <p style="margin-top: 25px;">We look forward to working with you!</p>
          <p><strong>The ${tenantName} Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This invitation was sent via TickTrack Pro</p>
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
          <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
            If you received this email by mistake, please ignore it. The registration link will not work without proper authorization.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You're Invited to Join ${tenantName} as a Contractor - TickTrack Pro`,
      html: htmlContent
    })

    if (error) {
      console.error('Failed to send contractor invitation email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log(`Contractor invitation email sent to ${email}`)
  } catch (error) {
    console.error('Error sending contractor invitation email:', error)
    throw error
  }
}

// Send welcome email with login credentials
export async function sendWelcomeEmail(
  email: string, 
  name: string, 
  password: string, 
  tenantName: string,
  branches: string[]
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping welcome email')
    console.log(`Would send welcome email to ${email} with password: ${password}`)
    return
  }

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const branchList = branches.length > 0 ? branches.join(', ') : 'All Branches'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .credentials { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #3b82f6; }
        .credential-item { margin: 10px 0; }
        .label { font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; margin-top: 5px; padding: 10px; background: #f1f5f9; border-radius: 4px; font-family: monospace; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; font-size: 14px; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Welcome to TickTrack Pro!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${tenantName}</p>
        </div>
        
        <div class="content">
          <p>Hello ${name},</p>
          <p>Your account has been created on TickTrack Pro. You can now log in and start using the system.</p>
          
          <div class="credentials">
            <h3 style="margin-top: 0; color: #1a365d;">Your Login Credentials</h3>
            <div class="credential-item">
              <div class="label">Email Address</div>
              <div class="value">${email}</div>
            </div>
            <div class="credential-item">
              <div class="label">Password</div>
              <div class="value">${password}</div>
            </div>
            <div class="credential-item">
              <div class="label">Assigned Branch(es)</div>
              <div class="value">${branchList}</div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${appUrl}/auth/login" class="button">Login to TickTrack Pro</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> For your security, please change your password after your first login. 
            Keep your login credentials confidential and do not share them with anyone.
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated message from TickTrack Pro</p>
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to TickTrack Pro - Your Login Credentials`,
      html: htmlContent
    })

    if (error) {
      console.error('Failed to send welcome email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log(`Welcome email sent to ${email}`)
  } catch (error) {
    console.error('Error sending welcome email:', error)
    throw error
  }
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string, 
  name: string, 
  newPassword: string,
  resetBy: string
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping password reset email')
    console.log(`Would send password reset email to ${email} with new password: ${newPassword}`)
    return
  }

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .credentials { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #dc2626; }
        .credential-item { margin: 10px 0; }
        .label { font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; margin-top: 5px; padding: 10px; background: #f1f5f9; border-radius: 4px; font-family: monospace; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .warning { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-top: 20px; font-size: 14px; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🔒 Password Reset</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your password has been reset</p>
        </div>
        
        <div class="content">
          <p>Hello ${name},</p>
          <p>Your password has been reset by an administrator (${resetBy}). Please use the new password below to log in.</p>
          
          <div class="credentials">
            <h3 style="margin-top: 0; color: #dc2626;">Your New Password</h3>
            <div class="credential-item">
              <div class="label">Email Address</div>
              <div class="value">${email}</div>
            </div>
            <div class="credential-item">
              <div class="label">New Password</div>
              <div class="value">${newPassword}</div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${appUrl}/auth/login" class="button">Login to TickTrack Pro</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> For your security, please change your password immediately after logging in.
            If you did not request this password reset, please contact your administrator immediately.
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated message from TickTrack Pro</p>
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Password Reset - TickTrack Pro`,
      html: htmlContent
    })

    if (error) {
      console.error('Failed to send password reset email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log(`Password reset email sent to ${email}`)
  } catch (error) {
    console.error('Error sending password reset email:', error)
    throw error
  }
}

// Send contractor password setup email
export async function sendContractorPasswordSetupEmail(
  email: string,
  name: string,
  setupLink: string,
  tenantName: string
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping contractor password setup email')
    console.log(`Would send password setup email to ${email} with link: ${setupLink}`)
    return
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
        .setup-box { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 25px; margin: 25px 0; border-radius: 12px; border: 2px solid #10b981; text-align: center; }
        .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 15px 0; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); }
        .footer { text-align: center; padding: 25px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ KYC Approved!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Welcome to ${tenantName}</p>
        </div>
        
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Great news! Your contractor KYC registration has been <strong style="color: #10b981;">approved</strong>. You're now ready to set up your account and start receiving service tickets.</p>
          
          <div class="setup-box">
            <h2 style="color: #059669; margin: 0 0 10px 0;">Set Up Your Password</h2>
            <p style="color: #64748b; margin: 0 0 15px 0;">Click the button below to create your login password</p>
            <a href="${setupLink}" class="button">Create Password →</a>
          </div>
          
          <p>Once you set up your password, you'll be able to:</p>
          <ul style="color: #64748b;">
            <li>View and accept assigned tickets</li>
            <li>Communicate with administrators</li>
            <li>Submit invoices for completed work</li>
            <li>Track your performance ratings</li>
            <li>Manage your service category availability</li>
          </ul>
          
          <p style="margin-top: 25px;">Welcome aboard!</p>
          <p><strong>The ${tenantName} Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This email was sent via TickTrack Pro</p>
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `🎉 KYC Approved - Set Up Your Password - ${tenantName}`,
      html: htmlContent
    })

    if (error) {
      console.error('Failed to send contractor password setup email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log(`Contractor password setup email sent to ${email}`)
  } catch (error) {
    console.error('Error sending contractor password setup email:', error)
    throw error
  }
}

// Send ticket notification email
export async function sendTicketNotificationEmail(
  email: string,
  name: string,
  ticketNumber: string,
  ticketTitle: string,
  status: string,
  message: string,
  actionUrl?: string
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping ticket notification email')
    return
  }

  const statusColors: Record<string, string> = {
    'OPEN': '#3b82f6',
    'IN_PROGRESS': '#f59e0b',
    'PENDING': '#8b5cf6',
    'RESOLVED': '#10b981',
    'CLOSED': '#6b7280',
    'ASSIGNED': '#0891b2'
  }

  const statusColor = statusColors[status] || '#6b7280'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .ticket-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; color: white; background: ${statusColor}; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Ticket Update</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Ticket #${ticketNumber}</p>
        </div>
        
        <div class="content">
          <p>Hello ${name},</p>
          
          <div class="ticket-info">
            <div style="margin-bottom: 15px;">
              <span class="status-badge">${status.replace('_', ' ')}</span>
            </div>
            <h3 style="margin: 0 0 10px 0; color: #1a365d;">${ticketTitle}</h3>
            <p style="margin: 0; color: #64748b;">${message}</p>
          </div>
          
          ${actionUrl ? `
          <div style="text-align: center;">
            <a href="${actionUrl}" class="button">View Ticket</a>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>This is an automated message from TickTrack Pro</p>
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Ticket #${ticketNumber} - ${status.replace('_', ' ')} - ${ticketTitle}`,
      html: htmlContent
    })

    if (error) {
      console.error('Failed to send ticket notification email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log(`Ticket notification email sent to ${email}`)
  } catch (error) {
    console.error('Error sending ticket notification email:', error)
    throw error
  }
}

// Send email to admin(s) when a new ticket is created
export async function sendNewTicketEmailToAdmin(
  adminEmail: string,
  data: {
    adminName: string
    ticketNumber: string
    ticketTitle: string
    ticketDescription: string
    priority: string
    type: string
    branchName: string
    userName: string
    userEmail: string
    responseDeadline: Date | null
  }
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping new ticket email to admin')
    return
  }

  const priorityColors: Record<string, string> = {
    'CRITICAL': '#dc2626',
    'HIGH': '#ea580c',
    'MEDIUM': '#ca8a04',
    'LOW': '#16a34a'
  }

  const priorityColor = priorityColors[data.priority] || '#6b7280'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .ticket-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
        .priority-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; color: white; background: ${priorityColor}; }
        .type-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; color: #1a365d; background: #e2e8f0; margin-left: 8px; }
        .detail-row { padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; }
        .detail-value { font-size: 16px; margin-top: 4px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
        .deadline { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🎫 New Ticket Created</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Ticket #${data.ticketNumber}</p>
        </div>
        
        <div class="content">
          <p>Hello ${data.adminName},</p>
          <p>A new ticket has been created and requires your attention.</p>
          
          <div class="ticket-info">
            <div style="margin-bottom: 15px;">
              <span class="priority-badge">${data.priority}</span>
              <span class="type-badge">${data.type}</span>
            </div>
            
            <h2 style="margin: 0 0 15px 0; color: #1a365d;">${data.ticketTitle}</h2>
            
            <div class="detail-row">
              <div class="detail-label">Description</div>
              <div class="detail-value">${data.ticketDescription.substring(0, 200)}${data.ticketDescription.length > 200 ? '...' : ''}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Branch</div>
              <div class="detail-value">${data.branchName}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Raised By</div>
              <div class="detail-value">${data.userName} (${data.userEmail})</div>
            </div>
            
            ${data.responseDeadline ? `
            <div class="deadline">
              <strong>⏰ Response Deadline:</strong> ${data.responseDeadline.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${appUrl}/admin/tickets" class="button" style="color: white;">View & Assign Ticket</a>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated message from TickTrack Pro</p>
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `🎫 New ${data.priority} Ticket #${data.ticketNumber} - ${data.ticketTitle}`,
      html: htmlContent
    })

    if (error) {
      console.error('Failed to send new ticket email to admin:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log(`New ticket email sent to admin ${adminEmail}`)
  } catch (error) {
    console.error('Error sending new ticket email to admin:', error)
    throw error
  }
}

// Send email to contractor when assigned a job
export async function sendJobAssignedEmailToContractor(
  contractorEmail: string,
  data: {
    contractorName: string
    ticketNumber: string
    ticketTitle: string
    ticketDescription: string
    priority: string
    type: string
    location: string
    userName: string
    userPhone: string
    resolutionDeadline: Date | null
    companyName: string
  }
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping job assigned email to contractor')
    return
  }

  const priorityColors: Record<string, string> = {
    'CRITICAL': '#dc2626',
    'HIGH': '#ea580c',
    'MEDIUM': '#ca8a04',
    'LOW': '#16a34a'
  }

  const priorityColor = priorityColors[data.priority] || '#6b7280'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0891b2; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .job-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
        .priority-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; color: white; background: ${priorityColor}; }
        .detail-row { padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; }
        .detail-value { font-size: 16px; margin-top: 4px; }
        .contact-box { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 10px 5px; font-weight: bold; }
        .button-secondary { background: #6b7280; }
        .deadline { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🔧 New Job Assigned</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Ticket #${data.ticketNumber}</p>
        </div>
        
        <div class="content">
          <p>Hello ${data.contractorName},</p>
          <p>You have been assigned a new job from <strong>${data.companyName}</strong>. Please review and accept or reject.</p>
          
          <div class="job-info">
            <div style="margin-bottom: 15px;">
              <span class="priority-badge">${data.priority} PRIORITY</span>
            </div>
            
            <h2 style="margin: 0 0 15px 0; color: #0891b2;">${data.ticketTitle}</h2>
            
            <div class="detail-row">
              <div class="detail-label">Description</div>
              <div class="detail-value">${data.ticketDescription.substring(0, 300)}${data.ticketDescription.length > 300 ? '...' : ''}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Type</div>
              <div class="detail-value">${data.type}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Location</div>
              <div class="detail-value">${data.location}</div>
            </div>
            
            <div class="contact-box">
              <div class="detail-label">📞 Contact Person</div>
              <div class="detail-value">${data.userName}</div>
              <div style="font-size: 18px; font-weight: bold; color: #10b981; margin-top: 5px;">${data.userPhone}</div>
            </div>
            
            ${data.resolutionDeadline ? `
            <div class="deadline">
              <strong>⏰ Resolution Deadline:</strong> ${data.resolutionDeadline.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${appUrl}/contractor" class="button" style="color: white;">Accept / Reject Job</a>
          </div>
          
          <p style="text-align: center; color: #64748b; margin-top: 20px;">
            Please respond as soon as possible to confirm your availability.
          </p>
        </div>
        
        <div class="footer">
          <p>This is an automated message from TickTrack Pro</p>
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: contractorEmail,
      subject: `🔧 Job Assigned - Ticket #${data.ticketNumber} - ${data.priority} Priority`,
      html: htmlContent
    })

    if (error) {
      console.error('Failed to send job assigned email to contractor:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log(`Job assigned email sent to contractor ${contractorEmail}`)
  } catch (error) {
    console.error('Error sending job assigned email to contractor:', error)
    throw error
  }
}

// Send email when job is closed/completed
export async function sendJobClosedEmail(
  email: string,
  data: {
    recipientName: string
    recipientType: 'admin' | 'contractor'
    ticketNumber: string
    ticketTitle: string
    contractorName: string
    completedAt: Date
    rating?: number
    feedback?: string
  }
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping job closed email')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const isContractor = data.recipientType === 'contractor'
  const headerColor = isContractor ? '#10b981' : '#1a365d'

  const ratingHtml = data.rating ? `
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center;">
      <div style="font-size: 12px; color: #92400e; text-transform: uppercase; font-weight: bold;">Customer Rating</div>
      <div style="font-size: 28px; color: #f59e0b; margin: 10px 0;">${'★'.repeat(data.rating)}${'☆'.repeat(5 - data.rating)}</div>
      <div style="font-size: 18px; font-weight: bold;">${data.rating}/5 Stars</div>
      ${data.feedback ? `<p style="margin-top: 10px; font-style: italic; color: #64748b;">"${data.feedback}"</p>` : ''}
    </div>
  ` : ''

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${headerColor}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .job-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
        .completed-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-size: 16px; font-weight: bold; color: white; background: #10b981; }
        .detail-row { padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; }
        .detail-value { font-size: 16px; margin-top: 4px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✅ Job Completed & Closed</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Ticket #${data.ticketNumber}</p>
        </div>
        
        <div class="content">
          <p>Hello ${data.recipientName},</p>
          <p>${isContractor ? 'The following job you completed has been closed.' : 'The following ticket has been completed and closed.'}</p>
          
          <div class="job-info">
            <div style="margin-bottom: 15px; text-align: center;">
              <span class="completed-badge">✓ COMPLETED</span>
            </div>
            
            <h2 style="margin: 0 0 15px 0; color: #1a365d; text-align: center;">${data.ticketTitle}</h2>
            
            <div class="detail-row">
              <div class="detail-label">Contractor</div>
              <div class="detail-value">${data.contractorName}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Completed At</div>
              <div class="detail-value">${data.completedAt.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}</div>
            </div>
            
            ${ratingHtml}
          </div>
          
          <div style="text-align: center;">
            <a href="${appUrl}/${isContractor ? 'contractor' : 'admin/tickets'}" class="button" style="color: white;">View Details</a>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated message from TickTrack Pro</p>
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `✅ Job Closed - Ticket #${data.ticketNumber}${data.rating ? ` - ${data.rating}/5 Stars` : ''}`,
      html: htmlContent
    })

    if (error) {
      console.error('Failed to send job closed email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log(`Job closed email sent to ${email}`)
  } catch (error) {
    console.error('Error sending job closed email:', error)
    throw error
  }
}
