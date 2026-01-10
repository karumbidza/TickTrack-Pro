# TickTrack Pro - SaaS Setup & Configuration Guide

## 🎯 Overview

TickTrack Pro is a multi-tenant SaaS platform for ticket/job management with the following architecture:

```
Platform Owner (Super Admin)
    └── Tenants (Companies)
            ├── Tenant Admins
            ├── HQ Admins  
            ├── End Users
            └── Contractors
```

---

## 🔐 1. Super Admin (Platform Manager) Setup

### Access the Super Admin Dashboard
- URL: `https://tick-trackpro.com/super-admin`
- Role: `SUPER_ADMIN`

### Super Admin Capabilities:
1. **Tenant Management**
   - Create new tenant companies
   - Enable/disable tenants
   - View tenant statistics
   - Manage tenant features (toggle features on/off)

2. **Feature Gating**
   - `assetManagement` - Asset registry feature
   - `advancedReporting` - Advanced analytics
   - `multiLocation` - Multiple branch support
   - `contractorManagement` - Contractor portal
   - `slaTracking` - SLA monitoring
   - `invoicing` - Invoice management

3. **Subscription Management**
   - View subscription status per tenant
   - Manual subscription adjustments

### Create a Super Admin User:
```bash
# SSH into server
ssh root@167.71.51.176

# Run the database command
cd /var/www/ticktrack-pro
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createSuperAdmin() {
  const hashedPassword = await bcrypt.hash('YourSecurePassword123!', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'superadmin@tick-trackpro.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'superadmin@tick-trackpro.com',
      name: 'Platform Manager',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
      isApproved: true
    }
  });
  console.log('Super Admin created:', user.email);
  await prisma.\$disconnect();
}
createSuperAdmin();
"
```

---

## 💳 2. Paynow Payment Gateway Setup

### Step 1: Register with Paynow
1. Go to https://paynow.co.zw
2. Create a merchant account
3. Get your Integration credentials:
   - **Integration ID** (numeric)
   - **Integration Key** (long string)

### Step 2: Configure Environment Variables

Add these to your `.env` file on the server:

```bash
# Paynow Configuration
PAYNOW_INTEGRATION_ID="your_integration_id"
PAYNOW_INTEGRATION_KEY="your_integration_key"
PAYNOW_RETURN_URL="https://tick-trackpro.com/billing/payment/return"
PAYNOW_RESULT_URL="https://tick-trackpro.com/api/payments/paynow/webhook"
```

### Step 3: Supported Payment Methods
- **EcoCash** - Mobile money (most popular in Zimbabwe)
- **OneMoney** - Mobile money
- **Visa/Mastercard** - Card payments
- **ZipIt** - Bank transfers

### Subscription Pricing (Configurable):
| Plan       | Monthly USD | Yearly USD | Features                     |
|------------|-------------|------------|------------------------------|
| BASIC      | $29         | $290       | 50 tickets/mo, 5 users       |
| PRO        | $79         | $790       | Unlimited tickets, 25 users  |
| ENTERPRISE | $199        | $1,990     | All features, unlimited      |

---

## 🏗️ 3. Multi-Tenant Architecture

### Tenant Isolation
- Each tenant has their own:
  - Users
  - Tickets
  - Assets
  - Contractors
  - Branches/Locations
  - Asset Categories
  - Settings

### Tenant Creation Flow:
1. Super Admin creates tenant via dashboard
2. System generates:
   - Tenant record with unique slug
   - Initial TENANT_ADMIN user
   - Default asset categories
   - Default notification settings

### User Roles per Tenant:
| Role           | Permissions                                    |
|----------------|------------------------------------------------|
| TENANT_ADMIN   | Full control of tenant                         |
| HQ_ADMIN       | Manage all branches, tickets, contractors      |
| END_USER       | Create tickets, view own tickets               |
| CONTRACTOR     | Accept jobs, update status, submit invoices    |

---

## 📧 4. Email Service Setup (Optional but Recommended)

### Using SMTP (Gmail, SendGrid, etc.):
```bash
# Add to .env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@tick-trackpro.com"
```

### Email Templates Available:
- User invitation
- Password reset
- Ticket notifications
- Invoice notifications

---

## 📱 5. SMS Service Setup (Africa's Talking)

```bash
# Add to .env
AFRICASTALKING_API_KEY="your_api_key"
AFRICASTALKING_USERNAME="your_username"
AFRICASTALKING_SENDER_ID="TICKTRACK"
```

---

## 🚀 6. Production Deployment Checklist

### Environment Variables Required:
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname?schema=public"

# Auth
NEXTAUTH_SECRET="generate-a-secure-random-string-64-chars"
NEXTAUTH_URL="https://tick-trackpro.com"

# App
NEXT_PUBLIC_APP_URL="https://tick-trackpro.com"

# Paynow (Zimbabwe Payments)
PAYNOW_INTEGRATION_ID=""
PAYNOW_INTEGRATION_KEY=""
PAYNOW_RETURN_URL="https://tick-trackpro.com/billing/payment/return"
PAYNOW_RESULT_URL="https://tick-trackpro.com/api/payments/paynow/webhook"

# Email (optional)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""

# SMS (optional)
AFRICASTALKING_API_KEY=""
AFRICASTALKING_USERNAME=""
AFRICASTALKING_SENDER_ID=""
```

### Security Best Practices:
1. ✅ Use HTTPS (SSL certificate)
2. ✅ Strong NEXTAUTH_SECRET
3. ✅ Database password security
4. ✅ Rate limiting on APIs
5. ✅ Input validation on all forms

---

## 📊 7. SaaS Metrics to Track

### Platform Level (Super Admin):
- Total tenants
- Active vs inactive tenants
- Revenue (MRR, ARR)
- Trial conversions
- Churn rate

### Tenant Level:
- Ticket volume
- Response times
- Resolution times
- User activity
- Contractor performance

---

## 🔄 8. Subscription Workflow

### New Tenant Registration:
1. Company registers via `/auth/company-register`
2. Starts on FREE/TRIAL plan
3. Prompted to subscribe for full features
4. Payment via Paynow (EcoCash/Card)
5. Subscription activated

### Renewal Flow:
1. System checks subscription expiry
2. Sends reminder emails (7 days, 3 days, 1 day before)
3. Payment processed on due date
4. If failed, sends overdue notification
5. Grace period (7 days)
6. Account limited if not renewed

---

## 🛠️ 9. Admin Scripts

### Clean All Data (Fresh Start):
```bash
node scripts/clean-ticket-data.js
```

### Seed Default Categories:
```bash
# API call
curl -X POST https://tick-trackpro.com/api/asset-categories/seed
```

### Generate Database Backup:
```bash
pg_dump -U ticktrack ticktrack_prod > backup_$(date +%Y%m%d).sql
```

---

## 📞 Support Contacts

- **Technical Issues**: admin@tick-trackpro.com
- **Billing**: billing@tick-trackpro.com
- **Sales**: sales@tick-trackpro.com

---

*Last Updated: January 2026*
