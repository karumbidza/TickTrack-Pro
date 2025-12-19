#!/bin/bash
# ============================================
# STEP 3: Application Deployment
# Run this as 'deploy' user
# ============================================

echo "📦 Deploying TickTrack Pro application..."

# Create app directory
sudo mkdir -p /var/www/ticktrack-pro
sudo chown deploy:deploy /var/www/ticktrack-pro

# Clone the repository
cd /var/www/ticktrack-pro
git clone https://github.com/karumbidza/TickTrack-Pro.git .

# Install dependencies
npm install

# Create production environment file
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://ticktrack:YOUR_PASSWORD@localhost:5432/ticktrack_prod"

# NextAuth
NEXTAUTH_SECRET="generate-a-32-char-random-string-here"
NEXTAUTH_URL="https://tick-trackpro.com"

# Email (Brevo/Sendinblue)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="your-brevo-smtp-login"
SMTP_PASS="your-brevo-smtp-password"
EMAIL_FROM="noreply@tick-trackpro.com"

# SMS (Africa's Talking)
AT_API_KEY="your-africastalking-api-key"
AT_USERNAME="your-africastalking-username"
AT_SENDER_ID="TICKTRACK"

# App Settings
NODE_ENV="production"
EOF

echo "⚠️  IMPORTANT: Edit .env file with your actual credentials!"
echo "   nano /var/www/ticktrack-pro/.env"
