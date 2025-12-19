#!/bin/bash
# ============================================
# STEP 6: Setup Nginx and SSL
# Run as root
# ============================================

echo "🔧 Configuring Nginx..."

# Copy nginx config (make sure to edit the domain first!)
sudo cp /var/www/ticktrack-pro/deployment/05-nginx.conf /etc/nginx/sites-available/ticktrack-pro

# Enable the site
sudo ln -sf /etc/nginx/sites-available/ticktrack-pro /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

echo "✅ Nginx configured!"
echo ""
echo "📌 Before SSL setup:"
echo "1. Point your domain DNS to this server IP"
echo "2. Wait for DNS propagation (5-30 minutes)"
echo ""
echo "Then run SSL setup:"
echo "sudo certbot --nginx -d tick-trackpro.com -d www.tick-trackpro.com"
