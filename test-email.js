const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'karumbidzaallen21@gmail.com',
    pass: 'rbmd jzbu gaap kkxh'
  }
})

async function testEmail() {
  try {
    console.log('Testing email connection...')
    const info = await transporter.sendMail({
      from: 'TickTrack Pro <karumbidzaallen21@gmail.com>',
      to: 'karumbidzaallen21@gmail.com',
      subject: 'Test Email from TickTrack Pro',
      html: '<h1>Test Email</h1><p>If you receive this, email is working!</p>'
    })
    console.log('✅ Email sent successfully!')
    console.log('Message ID:', info.messageId)
  } catch (error) {
    console.error('❌ Email failed:', error.message)
    console.error('Full error:', error)
  }
}

testEmail()
