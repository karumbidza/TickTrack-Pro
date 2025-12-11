/**
 * Test SMS Script for Africa's Talking
 * 
 * Run with: node scripts/test-sms.js +263776183229
 * 
 * NOTE: In sandbox mode, messages won't be delivered to real phones.
 * Check the sandbox outbox at:
 * https://account.africastalking.com/apps/sandbox/sms/bulk/outbox
 */

const AfricasTalking = require('africastalking')

// Load environment variables
require('dotenv').config()

const apiKey = process.env.AFRICASTALKING_API_KEY
const username = process.env.AFRICASTALKING_USERNAME || 'sandbox'

console.log('=== Africa\'s Talking SMS Test ===\n')
console.log('Configuration:')
console.log(`  Username: ${username}`)
console.log(`  API Key: ${apiKey ? apiKey.substring(0, 20) + '...' : 'NOT SET'}`)
console.log(`  Mode: ${username === 'sandbox' ? 'SANDBOX (messages won\'t be delivered to real phones)' : 'PRODUCTION'}`)
console.log('')

if (!apiKey) {
  console.error('ERROR: AFRICASTALKING_API_KEY is not set in .env file')
  process.exit(1)
}

// Get phone number from command line
const phoneNumber = process.argv[2]

if (!phoneNumber) {
  console.log('Usage: node scripts/test-sms.js <phone_number>')
  console.log('Example: node scripts/test-sms.js +263776183229')
  console.log('')
  console.log('⚠️  IMPORTANT FOR SANDBOX MODE:')
  console.log('1. Go to: https://account.africastalking.com/apps/sandbox/sms/bulk/outbox')
  console.log('2. Click "Simulator" in the left sidebar')
  console.log('3. Add your phone number to the simulator')
  console.log('4. Run this script again')
  console.log('5. Check the simulator to see the message')
  process.exit(1)
}

// Initialize Africa's Talking
const credentials = {
  apiKey,
  username
}

const africastalking = AfricasTalking(credentials)
const sms = africastalking.SMS

// Format phone number
function formatPhone(phone) {
  let cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '+263' + cleaned.substring(1)
  }
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  return cleaned
}

const formattedPhone = formatPhone(phoneNumber)
console.log(`Sending test SMS to: ${formattedPhone}`)
console.log('')

// Send test message
const message = `TICKTRACK PRO Test Message

This is a test SMS sent at ${new Date().toLocaleString()}.

If you received this, SMS notifications are working!`

const options = {
  to: [formattedPhone],
  message: message
}

console.log('Sending message...')
console.log('')

sms.send(options)
  .then(response => {
    console.log('API Response:')
    console.log(JSON.stringify(response, null, 2))
    console.log('')
    
    if (response.SMSMessageData?.Recipients) {
      for (const recipient of response.SMSMessageData.Recipients) {
        if (recipient.statusCode === 101 || recipient.status === 'Success') {
          console.log(`✅ SUCCESS: Message sent to ${recipient.number}`)
          console.log(`   Message ID: ${recipient.messageId}`)
          console.log(`   Cost: ${recipient.cost}`)
        } else {
          console.log(`❌ FAILED: ${recipient.status} (Code: ${recipient.statusCode})`)
        }
      }
    }
    
    console.log('')
    if (username === 'sandbox') {
      console.log('📱 SANDBOX MODE:')
      console.log('   Messages are NOT delivered to real phones in sandbox mode.')
      console.log('   To view your message, go to:')
      console.log('   https://account.africastalking.com/apps/sandbox/sms/bulk/outbox')
      console.log('')
      console.log('   To receive REAL SMS, you need to:')
      console.log('   1. Create a production app at https://account.africastalking.com')
      console.log('   2. Get a production API key')
      console.log('   3. Buy SMS credits')
      console.log('   4. Update AFRICASTALKING_USERNAME in .env to your app name')
    }
  })
  .catch(error => {
    console.error('❌ ERROR:', error.message || error)
    console.log('')
    console.log('Common issues:')
    console.log('1. Invalid API key - check your AFRICASTALKING_API_KEY')
    console.log('2. Invalid username - should be "sandbox" for testing or your app name for production')
    console.log('3. Network issue - check your internet connection')
  })
