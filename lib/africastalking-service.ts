// @ts-ignore - Africa's Talking SDK doesn't have TypeScript types
import AfricasTalking from 'africastalking'
import { logger } from './logger'

// Africa's Talking Configuration
const apiKey = process.env.AFRICASTALKING_API_KEY
const username = process.env.AFRICASTALKING_USERNAME || 'sandbox'
// Sender ID - requires approval from Africa's Talking dashboard
// IMPORTANT: Set to empty string or remove from .env until approved
// Using an unapproved sender ID will cause "InvalidSenderId" error
const senderId = process.env.AFRICASTALKING_SENDER_ID || ''

// Track if sender ID is invalid (for runtime fallback)
let senderIdInvalid = false

// Response time based on priority (in hours)
const RESPONSE_TIMES: Record<string, number> = {
  CRITICAL: 1,
  URGENT: 1,
  HIGH: 4,
  MEDIUM: 24,
  LOW: 48,
  DEFAULT: 24
}

// Get human-readable response time
function getResponseTimeText(priority: string): string {
  const hours = RESPONSE_TIMES[priority] || RESPONSE_TIMES.DEFAULT
  if (hours === 1) return '1 hour'
  if (hours < 24) return `${hours} hours`
  if (hours === 24) return '24 hours'
  return `${hours / 24} days`
}

// Initialize Africa's Talking client
function getATClient() {
  if (!apiKey) {
    logger.warn('Africa\'s Talking API key not configured. SMS notifications disabled.')
    return null
  }
  
  const credentials = {
    apiKey,
    username
  }
  
  return AfricasTalking(credentials)
}

// Format phone number to international format
export function formatPhoneNumber(phone: string, defaultCountryCode = '+263'): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // If it already starts with +, assume it's in international format
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  
  // If it starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2)
  }
  
  // For Zimbabwe numbers starting with 0, replace with +263
  if (cleaned.startsWith('0')) {
    return defaultCountryCode + cleaned.substring(1)
  }
  
  // If it doesn't have a country code, add the default
  if (!cleaned.startsWith('+')) {
    return defaultCountryCode + cleaned
  }
  
  return cleaned
}

// Validate phone number format
export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone)
  // E.164 format: + followed by 10-15 digits
  return /^\+[1-9]\d{9,14}$/.test(formatted)
}

interface SMSResult {
  phone: string
  success: boolean
  messageId?: string
  error?: string
  cost?: string
}

interface SMSResponse {
  success: boolean
  results: SMSResult[]
}

interface TicketAssignmentSMSData {
  contractorName: string
  contractorPhones: string[]
  ticketNumber: string
  ticketTitle: string
  priority: string
  adminName: string
  companyName: string
  ticketId: string
}

// Send SMS to one or multiple numbers
export async function sendSMS(
  to: string | string[],
  message: string,
  from?: string
): Promise<SMSResponse> {
  const client = getATClient()
  
  if (!client) {
    logger.debug('Africa\'s Talking not configured. SMS message would be:', message)
    return { 
      success: false, 
      results: [{ 
        phone: Array.isArray(to) ? to.join(', ') : to, 
        success: false, 
        error: 'Africa\'s Talking not configured' 
      }] 
    }
  }

  const sms = client.SMS
  const phones = Array.isArray(to) ? to : [to]
  const formattedPhones = phones.map(p => formatPhoneNumber(p))
  
  // Filter valid phone numbers
  const validPhones = formattedPhones.filter(p => isValidPhoneNumber(p))
  const invalidPhones = formattedPhones.filter(p => !isValidPhoneNumber(p))
  
  const results: SMSResult[] = []
  
  // Add results for invalid phones
  invalidPhones.forEach(phone => {
    results.push({ phone, success: false, error: 'Invalid phone number format' })
  })
  
  if (validPhones.length === 0) {
    return { success: false, results }
  }
  
  try {
    const options: {
      to: string[]
      message: string
      from?: string
    } = {
      to: validPhones,
      message
    }
    
    // Use sender ID if provided in function call, otherwise use environment variable
    // Skip sender ID if it was previously marked as invalid
    const senderToUse = senderIdInvalid ? undefined : (from || senderId)
    if (senderToUse) {
      options.from = senderToUse
      logger.debug(`Using sender ID: ${senderToUse}`)
    } else {
      logger.debug('Sending SMS without custom sender ID (using default)')
    }
    
    let response = await sms.send(options)
    
    logger.debug('Africa\'s Talking SMS Response:', JSON.stringify(response, null, 2))
    
    // Check for InvalidSenderId error and retry without sender ID
    if (response.SMSMessageData?.Message === 'InvalidSenderId' && options.from) {
      logger.warn(`Sender ID "${options.from}" is invalid. Retrying without sender ID...`)
      senderIdInvalid = true // Mark for future calls
      
      // Retry without sender ID
      delete options.from
      response = await sms.send(options)
      logger.debug('Retry SMS Response:', JSON.stringify(response, null, 2))
    }
    
    // Process response
    if (response.SMSMessageData?.Recipients) {
      for (const recipient of response.SMSMessageData.Recipients) {
        const success = recipient.status === 'Success' || recipient.statusCode === 101
        results.push({
          phone: recipient.number,
          success,
          messageId: recipient.messageId,
          error: success ? undefined : recipient.status,
          cost: recipient.cost
        })
        
        if (success) {
          logger.info(`SMS sent to ${recipient.number}. MessageId: ${recipient.messageId}, Cost: ${recipient.cost}`)
        } else {
          logger.error(`SMS failed to ${recipient.number}: ${recipient.status}`)
        }
      }
    }
    
    const allSucceeded = results.every(r => r.success)
    return { success: allSucceeded || results.some(r => r.success), results }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Africa\'s Talking SMS error:', errorMessage)
    
    validPhones.forEach(phone => {
      results.push({ phone, success: false, error: errorMessage })
    })
    
    return { success: false, results }
  }
}

// Send SMS notification when ticket is assigned to contractor
export async function sendTicketAssignmentSMS(data: TicketAssignmentSMSData): Promise<SMSResponse> {
  const responseTime = getResponseTimeText(data.priority)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const ticketUrl = `${appUrl}/contractor`
  
  // Keep message concise for SMS (160 chars per segment)
  const message = `TICKTRACK PRO: New Job

Hi ${data.contractorName},

Ticket: ${data.ticketNumber}
${data.ticketTitle.substring(0, 50)}${data.ticketTitle.length > 50 ? '...' : ''}
Priority: ${data.priority}
Company: ${data.companyName}
Assigned by: ${data.adminName}

Please ACCEPT/REJECT within ${responseTime}.

${ticketUrl}`

  if (data.contractorPhones.length === 0) {
    logger.warn(`No phone numbers available for contractor ${data.contractorName}`)
    return { success: false, results: [{ phone: 'none', success: false, error: 'No phone numbers' }] }
  }

  return sendSMS(data.contractorPhones, message)
}

// Send SMS when contractor accepts a job
export async function sendJobAcceptedSMS(
  adminPhone: string,
  contractorName: string,
  ticketNumber: string
): Promise<SMSResponse> {
  const message = `TICKTRACK: ${contractorName} ACCEPTED ticket ${ticketNumber}. Work will begin shortly.`
  return sendSMS(adminPhone, message)
}

// Send SMS when contractor rejects a job
export async function sendJobRejectedSMS(
  adminPhone: string,
  contractorName: string,
  ticketNumber: string,
  reason?: string
): Promise<SMSResponse> {
  const message = `TICKTRACK: ${contractorName} REJECTED ticket ${ticketNumber}.${reason ? ` Reason: ${reason}` : ''} Please reassign.`
  return sendSMS(adminPhone, message)
}

// Send SMS when job is completed
export async function sendJobCompletedSMS(
  recipientPhone: string,
  ticketNumber: string,
  contractorName: string
): Promise<SMSResponse> {
  const message = `TICKTRACK: Ticket ${ticketNumber} completed by ${contractorName}. Please review and close.`
  return sendSMS(recipientPhone, message)
}

// ==================== OPTIMIZED SMS TEMPLATES ====================

// Truncate text to fit SMS limits
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

// Format date for SMS
function formatDateForSMS(date: Date | null | undefined): string {
  if (!date) return 'TBD'
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Get SLA response time text
function getSLAText(priority: string): string {
  const slaMap: Record<string, string> = {
    CRITICAL: '30min',
    HIGH: '1hr',
    MEDIUM: '12hrs',
    LOW: '48hrs'
  }
  return slaMap[priority] || '24hrs'
}

// 1. NEW TICKET SMS (to Branch Admins)
export async function sendNewTicketSMS(
  adminPhones: string[],
  data: {
    ticketNumber: string
    title: string
    priority: string
    branchName: string
    userName: string
    responseDeadline: Date | null
  }
): Promise<SMSResponse> {
  const message = `TickTrack: New ${data.priority} ticket #${data.ticketNumber}
${truncateText(data.title, 35)}
Branch: ${truncateText(data.branchName, 20)}
By: ${truncateText(data.userName, 15)}
Respond by: ${formatDateForSMS(data.responseDeadline)}`

  return sendSMS(adminPhones, message)
}

// 2. JOB ASSIGNED SMS (to Contractor) - Already exists as sendTicketAssignmentSMS
// Enhanced version with user contact
export async function sendJobAssignedSMS(
  contractorPhone: string,
  data: {
    ticketNumber: string
    title: string
    priority: string
    location: string
    userPhone: string
    resolutionDeadline: Date | null
  }
): Promise<SMSResponse> {
  const message = `TickTrack: Job #${data.ticketNumber} assigned
${truncateText(data.title, 40)}
Priority: ${data.priority} | Due: ${getSLAText(data.priority)}
Location: ${truncateText(data.location, 25)}
Contact: ${data.userPhone}
Accept/Reject in app`

  return sendSMS(contractorPhone, message)
}

// 3. CONTRACTOR ACCEPTED SMS (to User)
export async function sendContractorAcceptedToUserSMS(
  userPhone: string,
  data: {
    ticketNumber: string
    contractorName: string
    contractorPhone: string
    arrivalDate: Date | null
  }
): Promise<SMSResponse> {
  const message = `TickTrack: #${data.ticketNumber} accepted by ${truncateText(data.contractorName, 15)}
ETA: ${formatDateForSMS(data.arrivalDate)}
Contact: ${data.contractorPhone}`

  return sendSMS(userPhone, message)
}

// 4. CONTRACTOR ACCEPTED SMS (to Admin)
export async function sendContractorAcceptedToAdminSMS(
  adminPhone: string,
  data: {
    ticketNumber: string
    contractorName: string
    arrivalDate: Date | null
  }
): Promise<SMSResponse> {
  const message = `TickTrack: #${data.ticketNumber} accepted
Contractor: ${truncateText(data.contractorName, 20)}
ETA: ${formatDateForSMS(data.arrivalDate)}`

  return sendSMS(adminPhone, message)
}

// 5. CONTRACTOR REJECTED SMS (to Admin)
export async function sendContractorRejectedSMS(
  adminPhone: string,
  data: {
    ticketNumber: string
    contractorName: string
    reason: string
  }
): Promise<SMSResponse> {
  const message = `TickTrack: #${data.ticketNumber} REJECTED by ${truncateText(data.contractorName, 15)}
Reason: ${truncateText(data.reason, 50)}
Please reassign`

  return sendSMS(adminPhone, message)
}

// 6. JOB COMPLETED SMS (to User)
export async function sendJobCompletedToUserSMS(
  userPhone: string,
  data: {
    ticketNumber: string
    contractorName: string
  }
): Promise<SMSResponse> {
  const message = `TickTrack: Ticket #${data.ticketNumber} completed by ${truncateText(data.contractorName, 20)}. Please rate the service in the app.`

  return sendSMS(userPhone, message)
}

// 7. JOB COMPLETED SMS (to Admin)
export async function sendJobCompletedToAdminSMS(
  adminPhone: string,
  data: {
    ticketNumber: string
    contractorName: string
    completedAt: Date
  }
): Promise<SMSResponse> {
  const message = `TickTrack: #${data.ticketNumber} completed
By: ${truncateText(data.contractorName, 20)}
At: ${formatDateForSMS(data.completedAt)}`

  return sendSMS(adminPhone, message)
}

// 8. RATING RECEIVED SMS (to Contractor)
export async function sendRatingReceivedSMS(
  contractorPhone: string,
  data: {
    ticketNumber: string
    rating: number
    feedback: string | null
  }
): Promise<SMSResponse> {
  const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating)
  const feedbackText = data.feedback ? `\n"${truncateText(data.feedback, 50)}"` : ''
  
  const message = `TickTrack: Job #${data.ticketNumber} rated ${stars} (${data.rating}/5)${feedbackText}`

  return sendSMS(contractorPhone, message)
}

// Generic SMS sender
export async function sendCustomSMS(
  to: string | string[],
  customMessage: string
): Promise<SMSResponse> {
  return sendSMS(to, customMessage)
}

// Check account balance
export async function getAccountBalance(): Promise<string | null> {
  const client = getATClient()
  if (!client) return null
  
  try {
    const application = client.APPLICATION
    const balance = await application.fetchApplicationData()
    return balance.UserData?.balance || null
  } catch (error) {
    logger.error('Failed to fetch balance:', error)
    return null
  }
}

// ==================== WHATSAPP FUNCTIONS ====================

interface WhatsAppResult {
  phone: string
  success: boolean
  messageId?: string
  error?: string
}

interface WhatsAppResponse {
  success: boolean
  results: WhatsAppResult[]
}

// Send WhatsApp message using Africa's Talking
// Note: WhatsApp Business API requires approval and setup with Africa's Talking
export async function sendWhatsApp(
  to: string | string[],
  message: string
): Promise<WhatsAppResponse> {
  const apiKey = process.env.AFRICASTALKING_API_KEY
  const username = process.env.AFRICASTALKING_USERNAME || 'sandbox'
  
  if (!apiKey) {
    logger.debug('Africa\'s Talking not configured. WhatsApp message would be:', message)
    return { 
      success: false, 
      results: [{ 
        phone: Array.isArray(to) ? to.join(', ') : to, 
        success: false, 
        error: 'Africa\'s Talking not configured' 
      }] 
    }
  }

  const phones = Array.isArray(to) ? to : [to]
  const formattedPhones = phones.map(p => formatPhoneNumber(p))
  const validPhones = formattedPhones.filter(p => isValidPhoneNumber(p))
  
  const results: WhatsAppResult[] = []
  
  // For now, we'll use SMS as fallback since WhatsApp requires additional setup
  // Africa's Talking WhatsApp requires:
  // 1. WhatsApp Business Account verification
  // 2. Business profile approval
  // 3. Message template approval for outbound messages
  
  // Until WhatsApp is set up, we'll send via SMS and log the WhatsApp intent
  logger.debug('WhatsApp message requested. Falling back to SMS until WhatsApp is configured.')
  
  // Send via SMS as fallback
  const smsResult = await sendSMS(validPhones, `[WhatsApp] ${message}`)
  
  return {
    success: smsResult.success,
    results: smsResult.results.map(r => ({
      phone: r.phone,
      success: r.success,
      messageId: r.messageId,
      error: r.error
    }))
  }
}

// Send WhatsApp notification when ticket is assigned
export async function sendTicketAssignmentWhatsApp(data: TicketAssignmentSMSData): Promise<WhatsAppResponse> {
  const responseTime = getResponseTimeText(data.priority)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // WhatsApp messages can be longer and support formatting
  const message = `🔧 *TICKTRACK PRO - New Job Assignment*

Hi ${data.contractorName},

You have been assigned a new ticket:

📋 *Ticket:* ${data.ticketNumber}
📝 *Title:* ${data.ticketTitle}
⚡ *Priority:* ${data.priority}
🏢 *Company:* ${data.companyName}
👤 *Assigned by:* ${data.adminName}

⏰ Please respond within *${responseTime}*

Login to view details: ${appUrl}/contractor`

  if (data.contractorPhones.length === 0) {
    logger.warn(`No phone numbers available for contractor ${data.contractorName}`)
    return { success: false, results: [{ phone: 'none', success: false, error: 'No phone numbers' }] }
  }

  return sendWhatsApp(data.contractorPhones, message)
}

// Send both SMS and WhatsApp (dual notification)
export async function sendDualNotification(
  phones: string[],
  smsMessage: string,
  whatsappMessage: string
): Promise<{ sms: SMSResponse; whatsapp: WhatsAppResponse }> {
  const [smsResult, whatsappResult] = await Promise.all([
    sendSMS(phones, smsMessage),
    sendWhatsApp(phones, whatsappMessage)
  ])
  
  return {
    sms: smsResult,
    whatsapp: whatsappResult
  }
}

// Send ticket assignment via both channels
export async function sendTicketAssignmentDual(data: TicketAssignmentSMSData): Promise<{
  sms: SMSResponse
  whatsapp: WhatsAppResponse
}> {
  const [smsResult, whatsappResult] = await Promise.all([
    sendTicketAssignmentSMS(data),
    sendTicketAssignmentWhatsApp(data)
  ])
  
  return {
    sms: smsResult,
    whatsapp: whatsappResult
  }
}

export default {
  sendSMS,
  sendTicketAssignmentSMS,
  sendJobAcceptedSMS,
  sendJobRejectedSMS,
  sendJobCompletedSMS,
  sendCustomSMS,
  sendWhatsApp,
  sendTicketAssignmentWhatsApp,
  sendDualNotification,
  sendTicketAssignmentDual,
  formatPhoneNumber,
  isValidPhoneNumber,
  getAccountBalance,
  // Optimized SMS templates
  sendNewTicketSMS,
  sendJobAssignedSMS,
  sendContractorAcceptedToUserSMS,
  sendContractorAcceptedToAdminSMS,
  sendContractorRejectedSMS,
  sendJobCompletedToUserSMS,
  sendJobCompletedToAdminSMS,
  sendRatingReceivedSMS
}
