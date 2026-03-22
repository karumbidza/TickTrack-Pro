# 🧹 SAFE DATA CLEANUP GUIDE

## Current Database State

### Test Tenants (3 total):
1. **MODIKO** - 1 user, 1 branch
2. **Demo Company** - 7 users, 2 tickets, 4 contractors, 3 branches, 3 assets
3. **REDAN COUPON (PVT) LTD** - 2 users, 1 branch

### Super Admins (WILL BE PRESERVED):
1. admin@ticktrackpro.com
2. superadmin@tick-trackpro.com

---

## 🔐 Safest Way to Clean Test Data

### Option 1: Use the Safe Cleanup Script (RECOMMENDED)

#### **Dry Run First (See what will be deleted):**
```bash
ssh root@167.71.51.176
cd /var/www/ticktrack-pro
node scripts/cleanup-test-data.js
```

#### **Execute Cleanup (With confirmation prompt):**
```bash
ssh root@167.71.51.176
cd /var/www/ticktrack-pro
node scripts/cleanup-test-data.js --execute
```

#### **Execute Cleanup (Skip confirmation - USE WITH CAUTION):**
```bash
node scripts/cleanup-test-data.js --execute --force
```

### Script Safety Features:
✅ **Dry run by default** - Shows what will be deleted without touching data  
✅ **Auto-backup** - Creates JSON backup before deletion  
✅ **Transaction-based** - All-or-nothing operation (rolls back on error)  
✅ **Super admin protection** - Never deletes SUPER_ADMIN users  
✅ **Confirmation prompt** - Requires "yes" before executing  
✅ **Verification** - Checks database state after cleanup  
✅ **Detailed logging** - Shows exactly what was deleted  

---

## 📋 Manual Cleanup (If Needed)

### Step 1: Backup First
```bash
ssh root@167.71.51.176
cd /var/www/ticktrack-pro
npx prisma db pull --force  # Update schema if needed
npx prisma db execute --stdin <<EOF
-- Create backup table
CREATE TABLE tenants_backup AS SELECT * FROM tenants;
EOF
```

### Step 2: Delete in Correct Order
```sql
-- 1. Delete child records first
DELETE FROM "Ticket";
DELETE FROM "Asset";
DELETE FROM "AssetCategory";
DELETE FROM "Contractor";
DELETE FROM "Invoice";
DELETE FROM "Quote";
DELETE FROM "Payment";
DELETE FROM "PaymentBatch";
DELETE FROM "Subscription";
DELETE FROM "Branch";
DELETE FROM "Location";
DELETE FROM "UserInvitation";
DELETE FROM "ContractorInvitation";
DELETE FROM "ContractorKYC";
DELETE FROM "Notification";

-- 2. Delete tenant users (preserve super admins)
DELETE FROM "User" 
WHERE "tenantId" IS NOT NULL 
AND role != 'SUPER_ADMIN';

-- 3. Delete tenants
DELETE FROM tenants;
```

---

## 🎯 Best Practices for Production

### 1. **Always Use Dry Run First**
```bash
node scripts/cleanup-test-data.js  # Preview changes
```

### 2. **Verify Backup Created**
- Script creates backup in `backups/before-cleanup-{timestamp}.json`
- Check file exists before proceeding

### 3. **Test in Staging First** (If available)
```bash
# Use staging database URL
DATABASE_URL="postgresql://..." node scripts/cleanup-test-data.js --execute
```

### 4. **Monitor During Cleanup**
```bash
# In another terminal, watch PM2 logs
ssh root@167.71.51.176
pm2 logs ticktrack-pro
```

### 5. **Verify After Cleanup**
```bash
ssh root@167.71.51.176
cd /var/www/ticktrack-pro
node scripts/show-tenants.js        # Should show 0 tenants
node scripts/show-super-admins.js   # Should show 2 super admins
```

---

## 🚨 Emergency Rollback

### If something goes wrong during cleanup:

#### **Option A: Restore from Backup File**
```bash
# The script creates JSON backups in /var/www/ticktrack-pro/backups/
# You'll need to manually restore data from the JSON if needed
```

#### **Option B: Database Snapshot Restore** (If you have DB backups)
```bash
# Contact your database provider (DigitalOcean, etc.)
# Restore from the latest snapshot before cleanup
```

#### **Option C: Transaction Rollback**
The script uses Prisma transactions - if ANY step fails, ALL changes are automatically rolled back. No partial deletions possible.

---

## 📊 Verification Checklist

After cleanup, verify:

- [ ] All 3 test tenants deleted
- [ ] 2 super admins still exist
- [ ] 0 tenant users remain
- [ ] Health check passes: `curl https://tick-trackpro.com/api/health`
- [ ] Login as super admin works
- [ ] Can create new tenant from scratch

---

## 🔄 Going Forward: Clean Slate Setup

### For Demo/Pitch:

1. **Clean the database:**
   ```bash
   node scripts/cleanup-test-data.js --execute
   ```

2. **Create fresh demo tenant:**
   - Register new company at https://tick-trackpro.com/register
   - Or use super admin panel to create tenant

3. **Seed with realistic data:**
   - Add 2-3 branches
   - Create 5-10 assets
   - Add 3-4 contractors
   - Create sample tickets with realistic workflow

4. **Take snapshot:**
   ```bash
   # Save this as your "demo baseline"
   # Restore after each pitch if needed
   ```

---

## 🛡️ Safety Summary

| Risk Level | Action | Safety |
|------------|--------|--------|
| 🟢 **SAFE** | Dry run | Read-only, shows preview |
| 🟡 **MEDIUM** | Execute with backup | Auto-backup + confirmation |
| 🔴 **CAUTION** | Force execute | No confirmation, use carefully |
| ⚫ **DANGER** | Manual SQL | No safety net, experts only |

**Recommended:** Always start with dry run, verify backup exists, then execute.

---

## 📞 Support

If you encounter issues:
1. Check backup file: `/var/www/ticktrack-pro/backups/`
2. Check PM2 logs: `pm2 logs ticktrack-pro`
3. Database logs: Check DigitalOcean dashboard
4. Rollback: Contact Allen or restore from snapshot

---

**Last Updated:** 2026-01-27  
**Script Location:** `scripts/cleanup-test-data.js`
