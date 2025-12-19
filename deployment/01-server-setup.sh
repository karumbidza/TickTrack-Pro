#!/bin/bash
# ============================================
# STEP 1: Initial Server Setup
# Run this as root on your new DigitalOcean droplet
# ============================================

echo "🚀 Starting TickTrack Pro Server Setup..."

# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl git nginx certbot python3-certbot-nginx ufw

# Create deploy user
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy

# Allow deploy user to sudo without password (for deployment)
echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Setup firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 globally (process manager)
npm install -g pm2

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

echo "✅ Base server setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: sudo -u postgres psql"
echo "2. Create database (see next script)"
