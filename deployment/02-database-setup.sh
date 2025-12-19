#!/bin/bash
# ============================================
# STEP 2: Database Setup
# Run this after server setup
# ============================================

echo "🗄️ Setting up PostgreSQL database..."

# Create database and user
sudo -u postgres psql << EOF
CREATE USER ticktrack WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';
CREATE DATABASE ticktrack_prod OWNER ticktrack;
GRANT ALL PRIVILEGES ON DATABASE ticktrack_prod TO ticktrack;
\q
EOF

echo "✅ Database created!"
echo ""
echo "Your DATABASE_URL is:"
echo "postgresql://ticktrack:YOUR_STRONG_PASSWORD_HERE@localhost:5432/ticktrack_prod"
echo ""
echo "Replace YOUR_STRONG_PASSWORD_HERE with a secure password!"
