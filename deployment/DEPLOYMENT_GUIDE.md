# ================================================
# TickTrack Pro - DigitalOcean Deployment Guide
# ================================================

## Prerequisites
- DigitalOcean account with payment method
- Domain name (e.g., ticktrackpro.com)
- GitHub repository access

## Quick Cost Summary
| Service | Cost |
|---------|------|
| Droplet (2GB RAM) | $12/month |
| Domain (optional) | $10-15/year |
| **Total** | ~$12-14/month |

---

## STEP 1: Create DigitalOcean Droplet

1. Log in to digitalocean.com
2. Create → Droplets
3. Settings:
   - **Region**: Frankfurt or Amsterdam
   - **Image**: Ubuntu 24.04 LTS
   - **Plan**: Basic $12/month (2GB RAM, 1 vCPU)
   - **Auth**: SSH Key (recommended)
   - **Hostname**: ticktrack-pro

4. Click "Create Droplet"
5. Note your IP address

---

## STEP 2: Connect to Server

```bash
ssh root@YOUR_DROPLET_IP
```

---

## STEP 3: Run Initial Server Setup

Copy and paste these commands:

```bash
# Update system
apt update && apt upgrade -y

# Install packages
apt install -y curl git nginx certbot python3-certbot-nginx ufw

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Setup firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## STEP 4: Create Database

```bash
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE USER ticktrack WITH PASSWORD 'YourSecurePassword123!';
CREATE DATABASE ticktrack_prod OWNER ticktrack;
GRANT ALL PRIVILEGES ON DATABASE ticktrack_prod TO ticktrack;
\q
```

---

## STEP 5: Deploy Application

```bash
# Create app directory
mkdir -p /var/www/ticktrack-pro
cd /var/www/ticktrack-pro

# Clone repository
git clone https://github.com/karumbidza/TickTrack-Pro.git .

# Install dependencies
npm install
```

---

## STEP 6: Configure Environment

```bash
nano .env
```

Add these contents (replace with your values):

```env
# Database
DATABASE_URL="postgresql://ticktrack:YourSecurePassword123!@localhost:5432/ticktrack_prod"

# NextAuth
NEXTAUTH_SECRET="your-32-character-secret-string-here"
NEXTAUTH_URL="https://yourdomain.com"

# Email (Brevo)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="your-brevo-login"
SMTP_PASS="your-brevo-password"
EMAIL_FROM="noreply@yourdomain.com"

# SMS (Africa's Talking) - Optional
AT_API_KEY="your-api-key"
AT_USERNAME="your-username"

# App
NODE_ENV="production"
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

---

## STEP 7: Build & Start Application

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed with demo data
npx prisma db seed

# Build Next.js
npm run build

# Start with PM2
pm2 start npm --name "ticktrack-pro" -- start
pm2 save
pm2 startup
```

---

## STEP 8: Configure Nginx

```bash
nano /etc/nginx/sites-available/ticktrack-pro
```

Add this config (replace yourdomain.com):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/ticktrack-pro /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## STEP 9: Setup Domain DNS

In your domain registrar (GoDaddy, Namecheap, etc.):

| Type | Name | Value |
|------|------|-------|
| A | @ | YOUR_DROPLET_IP |
| A | www | YOUR_DROPLET_IP |

Wait 5-30 minutes for DNS propagation.

---

## STEP 10: Setup SSL (HTTPS)

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow prompts:
- Enter email
- Agree to terms
- Choose redirect HTTP to HTTPS

SSL auto-renews via cron.

---

## STEP 11: Final Checks

```bash
# Check app status
pm2 status

# View logs
pm2 logs ticktrack-pro

# Test site
curl -I https://yourdomain.com
```

---

## Maintenance Commands

```bash
# View logs
pm2 logs ticktrack-pro

# Restart app
pm2 restart ticktrack-pro

# Update from GitHub
cd /var/www/ticktrack-pro
git pull
npm install
npm run build
pm2 restart ticktrack-pro

# Database backup
pg_dump -U ticktrack ticktrack_prod > backup.sql
```

---

## Troubleshooting

### App not starting?
```bash
pm2 logs ticktrack-pro --lines 50
```

### Database connection error?
```bash
sudo -u postgres psql -c "SELECT 1;"
```

### Nginx errors?
```bash
nginx -t
tail -f /var/log/nginx/error.log
```

### Port 3000 in use?
```bash
pm2 kill
pm2 start npm --name "ticktrack-pro" -- start
```

---

## Present to Client

Your app will be live at:
- **Production**: https://yourdomain.com
- **Admin Login**: admin@democompany.com / demo123
- **Contractor Login**: contractor1@freelance.com / contractor123

---

## Security Checklist

- [ ] Change default passwords
- [ ] Enable firewall (ufw)
- [ ] Setup SSL certificate
- [ ] Configure automatic backups
- [ ] Set up monitoring (optional: DO Monitoring)
