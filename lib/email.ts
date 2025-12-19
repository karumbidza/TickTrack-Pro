import nodemailer from 'nodemailer'

// Create transporter using SMTP
const createTransporter = () => {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000, // 10 seconds
    socketTimeout: 10000,
  })
}

// Resend API fallback for when SMTP is blocked
const sendWithResend = async (options: SendEmailOptions): Promise<boolean> => {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return false
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'TickTrack Pro <noreply@tick-trackpro.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    })
    
    if (response.ok) {
      console.log(`✅ Email sent via Resend to ${options.to}`)
      return true
    } else {
      const error = await response.text()
      console.error('Resend API error:', error)
      return false
    }
  } catch (error) {
    console.error('Resend API failed:', error)
    return false
  }
}

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

// Check if email is configured (either SMTP or Resend)
const isEmailConfigured = (): boolean => {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) || !!process.env.RESEND_API_KEY
}

// Exported interface for sending emails
interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Exported function for sending emails with full options
export async function sendMailWithNodemailer(options: SendEmailOptions): Promise<void> {
  // Try Resend first if configured (works on DigitalOcean where SMTP is blocked)
  if (process.env.RESEND_API_KEY) {
    const sent = await sendWithResend(options)
    if (sent) return
  }
  
  const transporter = createTransporter()
  
  if (!transporter) {
    console.log('📧 Email not configured (SMTP settings missing)')
    console.log(`   Would send to: ${options.to}`)
    console.log(`   Subject: ${options.subject}`)
    return
  }

  try {
    console.log(`📧 Sending email to ${options.to}...`)
    console.log(`   Subject: ${options.subject}`)
    console.log(`   From: ${FROM_EMAIL}`)
    
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    console.log(`✅ Email sent successfully to ${options.to}`)
    console.log(`   Message ID: ${info.messageId}`)
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${options.to}`)
    console.error(`   Error: ${error.message}`)
    console.error(`   Code: ${error.code}`)
    if (error.response) {
      console.error(`   Response: ${error.response}`)
    }
    throw error
  }
}

// Core email sending function (internal use)
async function sendEmailInternal(to: string, subject: string, html: string): Promise<void> {
  const transporter = createTransporter()
  
  if (!transporter) {
    console.log('📧 Email not configured (SMTP settings missing)')
    console.log(`   Would send to: ${to}`)
    console.log(`   Subject: ${subject}`)
    return
  }

  try {
    console.log(`📧 Sending email to ${to}...`)
    console.log(`   Subject: ${subject}`)
    console.log(`   From: ${FROM_EMAIL}`)
    
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })
    console.log(`✅ Email sent successfully to ${to}`)
    console.log(`   Message ID: ${info.messageId}`)
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${to}`)
    console.error(`   Error: ${error.message}`)
    console.error(`   Code: ${error.code}`)
    if (error.response) {
      console.error(`   Response: ${error.response}`)
    }
    throw error
  }
}

export async function sendRatingEmailToContractor(data: RatingEmailData): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping rating email notification')
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

  await sendEmailInternal(
    data.contractorEmail,
    `Job Rating Received - Ticket #${data.ticketNumber} (${data.overallRating}/5 Stars)`,
    htmlContent
  )
}

// Send email verification email
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationLink: string
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping verification email')
    console.log('Verification link:', verificationLink)
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

  await sendEmailInternal(email, 'Verify your email - TickTrack Pro', htmlContent)
}

// Generic email sender for other notifications
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping email notification')
    console.log(`   To: ${to}`)
    console.log(`   Subject: ${subject}`)
    return
  }

  await sendEmail(to, subject, html)
}

// Send contractor invitation email
export async function sendContractorInvitationEmail(
  email: string,
  companyName: string,
  registrationLink: string,
  tenantName: string,
  expiresAt: Date
): Promise<void> {
  // Always log the link for development
  console.log('📧 CONTRACTOR INVITATION LINK:')
  console.log(`   Email: ${email}`)
  console.log(`   Company: ${companyName}`)
  console.log(`   Link: ${registrationLink}`)

  if (!isEmailConfigured()) {
    console.log('   ⚠️ Email not configured - use the link above')
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
        .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
        .invite-box { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; margin: 25px 0; border-radius: 12px; border: 2px solid #3b82f6; text-align: center; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 15px 0; }
        .footer { text-align: center; padding: 25px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 You're Invited!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Join ${tenantName} as a Service Contractor</p>
        </div>
        
        <div class="content">
          <p>Hello <strong>${companyName}</strong>,</p>
          <p>You have been invited to register as a contractor on <strong>${tenantName}'s</strong> TickTrack Pro platform.</p>
          
          <div class="invite-box">
            <h2 style="color: #1a365d; margin: 0 0 10px 0;">Complete Your Registration</h2>
            <a href="${registrationLink}" class="button" style="color: white;">Register Now →</a>
            <p style="font-size: 12px; color: #64748b; margin-top: 10px;">Link expires: ${expiryDate}</p>
          </div>
          
          <p>We look forward to working with you!</p>
          <p><strong>The ${tenantName} Team</strong></p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail(
    email,
    `You're Invited to Join ${tenantName} as a Contractor - TickTrack Pro`,
    htmlContent
  )
}

// Send welcome email with login credentials
export async function sendWelcomeEmail(
  email: string, 
  name: string, 
  password: string, 
  tenantName: string,
  branches: string[]
): Promise<void> {
  console.log('📧 WELCOME EMAIL:')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}`)

  if (!isEmailConfigured()) {
    console.log('   ⚠️ Email not configured')
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
        .label { font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; margin-top: 5px; padding: 10px; background: #f1f5f9; border-radius: 4px; font-family: monospace; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
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
          <p>Your account has been created on TickTrack Pro.</p>
          
          <div class="credentials">
            <h3 style="margin-top: 0; color: #1a365d;">Your Login Credentials</h3>
            <div style="margin: 10px 0;">
              <div class="label">Email Address</div>
              <div class="value">${email}</div>
            </div>
            <div style="margin: 10px 0;">
              <div class="label">Password</div>
              <div class="value">${password}</div>
            </div>
            <div style="margin: 10px 0;">
              <div class="label">Assigned Branch(es)</div>
              <div class="value">${branchList}</div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${appUrl}/auth/login" class="button" style="color: white;">Login to TickTrack Pro</a>
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail(email, `Welcome to TickTrack Pro - Your Login Credentials`, htmlContent)
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string, 
  name: string, 
  newPassword: string,
  resetBy: string
): Promise<void> {
  console.log('📧 PASSWORD RESET EMAIL:')
  console.log(`   Email: ${email}`)
  console.log(`   New Password: ${newPassword}`)

  if (!isEmailConfigured()) {
    console.log('   ⚠️ Email not configured')
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
        .label { font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; margin-top: 5px; padding: 10px; background: #f1f5f9; border-radius: 4px; font-family: monospace; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🔒 Password Reset</h1>
        </div>
        
        <div class="content">
          <p>Hello ${name},</p>
          <p>Your password has been reset by ${resetBy}.</p>
          
          <div class="credentials">
            <h3 style="margin-top: 0; color: #dc2626;">Your New Password</h3>
            <div style="margin: 10px 0;">
              <div class="label">Email Address</div>
              <div class="value">${email}</div>
            </div>
            <div style="margin: 10px 0;">
              <div class="label">New Password</div>
              <div class="value">${newPassword}</div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${appUrl}/auth/login" class="button" style="color: white;">Login to TickTrack Pro</a>
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail(email, `Password Reset - TickTrack Pro`, htmlContent)
}

// Send contractor password setup email
export async function sendContractorPasswordSetupEmail(
  email: string,
  name: string,
  setupLink: string,
  tenantName: string
): Promise<void> {
  console.log('📧 CONTRACTOR PASSWORD SETUP EMAIL:')
  console.log(`   Email: ${email}`)
  console.log(`   Link: ${setupLink}`)

  if (!isEmailConfigured()) {
    console.log('   ⚠️ Email not configured - use the link above')
    return
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; }
        .setup-box { background: #ecfdf5; padding: 25px; margin: 25px 0; border-radius: 12px; border: 2px solid #10b981; text-align: center; }
        .button { display: inline-block; background: #10b981; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; }
        .footer { text-align: center; padding: 25px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✅ KYC Approved!</h1>
          <p style="margin: 10px 0 0 0;">Welcome to ${tenantName}</p>
        </div>
        
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your contractor KYC registration has been <strong style="color: #10b981;">approved</strong>!</p>
          
          <div class="setup-box">
            <h2 style="color: #059669; margin: 0 0 10px 0;">Set Up Your Password</h2>
            <a href="${setupLink}" class="button" style="color: white;">Create Password →</a>
          </div>
          
          <p>Welcome aboard!</p>
          <p><strong>The ${tenantName} Team</strong></p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail(email, `🎉 KYC Approved - Set Up Your Password - ${tenantName}`, htmlContent)
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
          <p style="margin: 10px 0 0 0;">Ticket #${ticketNumber}</p>
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
            <a href="${actionUrl}" class="button" style="color: white;">View Ticket</a>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail(email, `Ticket #${ticketNumber} - ${status.replace('_', ' ')} - ${ticketTitle}`, htmlContent)
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
        .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🎫 New Ticket Created</h1>
          <p style="margin: 10px 0 0 0;">Ticket #${data.ticketNumber}</p>
        </div>
        
        <div class="content">
          <p>Hello ${data.adminName},</p>
          <p>A new ticket has been created and requires your attention.</p>
          
          <div class="ticket-info">
            <div style="margin-bottom: 15px;">
              <span class="priority-badge">${data.priority}</span>
            </div>
            
            <h2 style="margin: 0 0 15px 0; color: #1a365d;">${data.ticketTitle}</h2>
            <p style="color: #64748b;">${data.ticketDescription.substring(0, 200)}${data.ticketDescription.length > 200 ? '...' : ''}</p>
            <p><strong>Branch:</strong> ${data.branchName}</p>
            <p><strong>Raised By:</strong> ${data.userName} (${data.userEmail})</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${appUrl}/admin/tickets" class="button" style="color: white;">View & Assign Ticket</a>
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail(adminEmail, `🎫 New ${data.priority} Ticket #${data.ticketNumber} - ${data.ticketTitle}`, htmlContent)
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
        .contact-box { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 10px 5px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🔧 New Job Assigned</h1>
          <p style="margin: 10px 0 0 0;">Ticket #${data.ticketNumber}</p>
        </div>
        
        <div class="content">
          <p>Hello ${data.contractorName},</p>
          <p>You have been assigned a new job from <strong>${data.companyName}</strong>.</p>
          
          <div class="job-info">
            <div style="margin-bottom: 15px;">
              <span class="priority-badge">${data.priority} PRIORITY</span>
            </div>
            
            <h2 style="margin: 0 0 15px 0; color: #0891b2;">${data.ticketTitle}</h2>
            <p style="color: #64748b;">${data.ticketDescription.substring(0, 300)}${data.ticketDescription.length > 300 ? '...' : ''}</p>
            <p><strong>Location:</strong> ${data.location}</p>
            
            <div class="contact-box">
              <p style="margin: 0;"><strong>📞 Contact Person:</strong></p>
              <p style="margin: 5px 0 0 0;">${data.userName} - ${data.userPhone}</p>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${appUrl}/contractor" class="button" style="color: white;">Accept / Reject Job</a>
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail(contractorEmail, `🔧 Job Assigned - Ticket #${data.ticketNumber} - ${data.priority} Priority`, htmlContent)
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
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✅ Job Completed & Closed</h1>
          <p style="margin: 10px 0 0 0;">Ticket #${data.ticketNumber}</p>
        </div>
        
        <div class="content">
          <p>Hello ${data.recipientName},</p>
          
          <div class="job-info">
            <div style="margin-bottom: 15px; text-align: center;">
              <span class="completed-badge">✓ COMPLETED</span>
            </div>
            
            <h2 style="margin: 0 0 15px 0; color: #1a365d; text-align: center;">${data.ticketTitle}</h2>
            <p><strong>Contractor:</strong> ${data.contractorName}</p>
            <p><strong>Completed At:</strong> ${data.completedAt.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}</p>
            
            ${ratingHtml}
          </div>
          
          <div style="text-align: center;">
            <a href="${appUrl}/${isContractor ? 'contractor' : 'admin/tickets'}" class="button" style="color: white;">View Details</a>
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail(email, `✅ Job Closed - Ticket #${data.ticketNumber}${data.rating ? ` - ${data.rating}/5 Stars` : ''}`, htmlContent)
}

// Send user invitation email
export async function sendUserInvitationEmail(
  email: string,
  name: string,
  inviteLink: string,
  tenantName: string,
  expiresAt: Date
): Promise<void> {
  // Always log the link for development
  console.log('📧 USER INVITATION LINK:')
  console.log(`   Email: ${email}`)
  console.log(`   Name: ${name}`)
  console.log(`   Link: ${inviteLink}`)

  if (!isEmailConfigured()) {
    console.log('   ⚠️ Email not configured - use the link above')
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
        .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
        .invite-box { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; margin: 25px 0; border-radius: 12px; border: 2px solid #3b82f6; text-align: center; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 15px 0; }
        .footer { text-align: center; padding: 25px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 You're Invited!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Join ${tenantName} on TickTrack Pro</p>
        </div>
        
        <div class="content">
          <p>Hello${name ? ` <strong>${name}</strong>` : ''},</p>
          <p>You have been invited to join <strong>${tenantName}</strong> on TickTrack Pro.</p>
          
          <div class="invite-box">
            <h2 style="color: #1a365d; margin: 0 0 10px 0;">Complete Your Registration</h2>
            <a href="${inviteLink}" class="button" style="color: white;">Accept Invitation →</a>
            <p style="font-size: 12px; color: #64748b; margin-top: 10px;">Link expires: ${expiryDate}</p>
          </div>
          
          <p>We look forward to having you on board!</p>
          <p><strong>The ${tenantName} Team</strong></p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail(
    email,
    `You're Invited to Join ${tenantName} - TickTrack Pro`,
    htmlContent
  )
}
