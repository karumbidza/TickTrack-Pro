#!/bin/bash
# ============================================
# STEP 4: Build and Run Application
# Run after setting up .env file
# ============================================

cd /var/www/ticktrack-pro

echo "🔨 Building application..."

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database (optional - creates demo data)
# npx prisma db seed

# Build Next.js app
npm run build

echo "🚀 Starting application with PM2..."

# Start with PM2
pm2 start npm --name "ticktrack-pro" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u deploy --hp /home/deploy

echo "✅ Application is running!"
echo "   Check status: pm2 status"
echo "   View logs: pm2 logs ticktrack-pro"
