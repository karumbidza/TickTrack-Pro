#!/bin/bash
# ============================================
# Quick Update/Redeploy Script
# Run this when you push updates to GitHub
# ============================================

cd /var/www/ticktrack-pro

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔄 Generating Prisma client..."
npx prisma generate

echo "📊 Applying database migrations..."
npx prisma db push

echo "🔨 Building application..."
npm run build

echo "🔄 Restarting application..."
pm2 restart ticktrack-pro

echo "✅ Deployment complete!"
pm2 status
