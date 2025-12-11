import nodemailer from 'nodemailer'

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

export async function sendRatingEmailToContractor(data: RatingEmailData): Promise<void> {
  // Check if email is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('Email not configured, skipping rating email notification')
    console.log('Rating data that would be sent:', data)
    return
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

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

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: data.contractorEmail,
    subject: `Job Rating Received - Ticket #${data.ticketNumber} (${data.overallRating}/5 Stars)`,
    html: htmlContent
  }

  await transporter.sendMail(mailOptions)
  console.log(`Rating email sent to ${data.contractorEmail}`)
}

// Generic email sender for other notifications
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('Email not configured, skipping email notification')
    return
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html
  })
}

// Send welcome email with login credentials
export async function sendWelcomeEmail(
  email: string, 
  name: string, 
  password: string, 
  tenantName: string,
  branches: string[]
): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('Email not configured, skipping welcome email')
    console.log(`Would send welcome email to ${email} with password: ${password}`)
    return
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

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

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Welcome to TickTrack Pro - Your Login Credentials`,
    html: htmlContent
  })

  console.log(`Welcome email sent to ${email}`)
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string, 
  name: string, 
  newPassword: string,
  resetBy: string
): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('Email not configured, skipping password reset email')
    console.log(`Would send password reset email to ${email} with new password: ${newPassword}`)
    return
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

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

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Password Reset - TickTrack Pro`,
    html: htmlContent
  })

  console.log(`Password reset email sent to ${email}`)
}
