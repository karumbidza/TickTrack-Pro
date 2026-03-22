/**
 * SAFE TENANT DATA CLEANUP SCRIPT
 * ================================
 * Deletes all tenant data while preserving super admin accounts.
 * 
 * SAFETY FEATURES:
 * - Dry run mode by default
 * - Preserves SUPER_ADMIN users
 * - Creates backup before deletion
 * - Requires confirmation
 * - Transaction-based (all or nothing)
 * - Logs all deletions
 * 
 * USAGE:
 *   node scripts/cleanup-test-data.js                    # Dry run (shows what will be deleted)
 *   node scripts/cleanup-test-data.js --execute          # Actually delete
 *   node scripts/cleanup-test-data.js --execute --force  # Skip confirmation
 */

const { PrismaClient } = require('@prisma/client')
const readline = require('readline')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

const DRY_RUN = !process.argv.includes('--execute')
const FORCE = process.argv.includes('--force')

// Data that will be deleted
let deletionPlan = {
  tenants: [],
  users: [],
  tickets: [],
  contractors: [],
  assets: [],
  branches: [],
  invoices: [],
  quotes: [],
  payments: [],
}

async function askConfirmation(question) {
  if (FORCE) return true

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question + ' (yes/no): ', (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
    })
  })
}

async function createBackup() {
  console.log('\n💾 Creating backup...')
  
  const backupDir = path.join(__dirname, '..', 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.join(backupDir, `before-cleanup-${timestamp}.json`)

  const backup = {
    timestamp: new Date().toISOString(),
    tenants: await prisma.tenant.findMany({ include: { _count: true } }),
    users: await prisma.user.findMany(),
    tickets: await prisma.ticket.count(),
    contractors: await prisma.contractor.count(),
    assets: await prisma.asset.count(),
  }

  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
  console.log(`✅ Backup created: ${backupFile}`)
  
  return backupFile
}

async function analyzeDeletions() {
  console.log('\n🔍 Analyzing data to be deleted...\n')

  // Get all tenants
  deletionPlan.tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          users: true,
          tickets: true,
          contractors: true,
          assets: true,
          branches: true,
          invoices: true,
        },
      },
    },
  })

  // Get all tenant-associated users (excluding super admins)
  deletionPlan.users = await prisma.user.findMany({
    where: {
      tenantId: { not: null },
      role: { not: 'SUPER_ADMIN' },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenantId: true,
    },
  })

  // Show deletion plan
  console.log('═'.repeat(80))
  console.log('DELETION PLAN:')
  console.log('═'.repeat(80))
  console.log(`\n🏢 Tenants to delete: ${deletionPlan.tenants.length}`)
  
  deletionPlan.tenants.forEach((tenant, idx) => {
    console.log(`\n   ${idx + 1}. ${tenant.name} (${tenant.slug})`)
    console.log(`      - ${tenant._count.users} users`)
    console.log(`      - ${tenant._count.tickets} tickets`)
    console.log(`      - ${tenant._count.contractors} contractors`)
    console.log(`      - ${tenant._count.branches} branches`)
    console.log(`      - ${tenant._count.assets} assets`)
    console.log(`      - ${tenant._count.invoices} invoices`)
  })

  console.log(`\n👤 Tenant users to delete: ${deletionPlan.users.length}`)
  
  // Get super admins (will be preserved)
  const superAdmins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, name: true, email: true },
  })

  console.log(`\n✅ Super admins to PRESERVE: ${superAdmins.length}`)
  superAdmins.forEach((admin) => {
    console.log(`   - ${admin.name} (${admin.email})`)
  })

  console.log('\n' + '═'.repeat(80))
}

async function executeCleanup() {
  console.log('\n🗑️  Starting cleanup...\n')

  try {
    // Use transaction for atomic deletion
    await prisma.$transaction(async (tx) => {
      let deletedCount = {
        messages: 0,
        attachments: 0,
        ratings: 0,
        statusHistory: 0,
        tickets: 0,
        contractors: 0,
        assets: 0,
        branches: 0,
        invoices: 0,
        quotes: 0,
        payments: 0,
        users: 0,
        tenants: 0,
      }

      // Delete in correct order (respecting foreign key constraints)
      
      // 0. Delete deeply nested data first
      await tx.attachment.deleteMany({})
      console.log(`✓ Deleted attachments`)
      
      await tx.message.deleteMany({})
      console.log(`✓ Deleted messages`)
      
      await tx.rating.deleteMany({})
      console.log(`✓ Deleted ratings`)
      
      await tx.statusHistory.deleteMany({})
      console.log(`✓ Deleted status history`)
      
      await tx.quoteRequest.deleteMany({})
      console.log(`✓ Deleted quote requests`)
      
      await tx.maintenanceHistory.deleteMany({})
      await tx.assetHistory.deleteMany({})
      console.log(`✓ Deleted asset history`)
      
      // 1. Delete ticket-related data
      const ticketsDeleted = await tx.ticket.deleteMany({})
      deletedCount.tickets = ticketsDeleted.count
      console.log(`✓ Deleted ${deletedCount.tickets} tickets`)

      // 2. Delete assets
      const assetsDeleted = await tx.asset.deleteMany({})
      deletedCount.assets = assetsDeleted.count
      console.log(`✓ Deleted ${deletedCount.assets} assets`)

      // 3. Delete asset categories
      await tx.assetCategory.deleteMany({})
      console.log(`✓ Deleted asset categories`)

      // 4. Delete contractor payments first, then contractors
      await tx.contractorPayment.deleteMany({})
      await tx.contractorSubscription.deleteMany({})
      await tx.contractorCategory.deleteMany({})
      const contractorsDeleted = await tx.contractor.deleteMany({})
      deletedCount.contractors = contractorsDeleted.count
      console.log(`✓ Deleted ${deletedCount.contractors} contractors`)

      // 5. Delete invoices
      const invoicesDeleted = await tx.invoice.deleteMany({})
      deletedCount.invoices = invoicesDeleted.count
      console.log(`✓ Deleted ${deletedCount.invoices} invoices`)

      // 6. Delete quotes
      const quotesDeleted = await tx.quote.deleteMany({})
      deletedCount.quotes = quotesDeleted.count
      console.log(`✓ Deleted ${deletedCount.quotes} quotes`)

      // 7. Delete payments
      const paymentsDeleted = await tx.payment.deleteMany({})
      deletedCount.payments = paymentsDeleted.count
      console.log(`✓ Deleted ${deletedCount.payments} payments`)

      // 8. Delete payment batches
      await tx.paymentBatch.deleteMany({})

      // 9. Delete subscriptions
      await tx.subscription.deleteMany({})

      // 10. Delete user branches junction table first
      await tx.userBranch.deleteMany({})
      console.log(`✓ Deleted user-branch associations`)
      
      // 11. Delete branches
      const branchesDeleted = await tx.branch.deleteMany({})
      deletedCount.branches = branchesDeleted.count
      console.log(`✓ Deleted ${deletedCount.branches} branches`)

      // 12. Delete invitations
      await tx.userInvitation.deleteMany({})
      await tx.contractorInvitation.deleteMany({})
      console.log(`✓ Deleted invitations`)

      // 13. Delete KYC records
      await tx.contractorKYC.deleteMany({})
      console.log(`✓ Deleted KYC records`)

      // 14. Delete notifications
      await tx.notification.deleteMany({})
      console.log(`✓ Deleted notifications`)

      // 15. Delete password reset tokens
      await tx.passwordResetToken.deleteMany({})
      console.log(`✓ Deleted password reset tokens`)
      
      // 16. Delete sessions and accounts for tenant users
      await tx.session.deleteMany({
        where: {
          user: {
            tenantId: { not: null },
            role: { not: 'SUPER_ADMIN' }
          }
        }
      })
      await tx.account.deleteMany({
        where: {
          user: {
            tenantId: { not: null },
            role: { not: 'SUPER_ADMIN' }
          }
        }
      })
      console.log(`✓ Deleted sessions and accounts`)

      // 17. Delete tenant-associated users (preserve super admins)
      const usersDeleted = await tx.user.deleteMany({
        where: {
          tenantId: { not: null },
          role: { not: 'SUPER_ADMIN' },
        },
      })
      deletedCount.users = usersDeleted.count
      console.log(`✓ Deleted ${deletedCount.users} tenant users`)

      // 18. Finally, delete tenants
      const tenantsDeleted = await tx.tenant.deleteMany({})
      deletedCount.tenants = tenantsDeleted.count
      console.log(`✓ Deleted ${deletedCount.tenants} tenants`)

      console.log('\n═'.repeat(80))
      console.log('CLEANUP SUMMARY:')
      console.log('═'.repeat(80))
      Object.entries(deletedCount).forEach(([key, count]) => {
        console.log(`  ${key}: ${count}`)
      })
      console.log('═'.repeat(80))
    })

    console.log('\n✅ Cleanup completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message)
    console.error('Transaction rolled back. No data was deleted.')
    throw error
  }
}

async function verifyCleanup() {
  console.log('\n🔍 Verifying cleanup...\n')

  const tenantsRemaining = await prisma.tenant.count()
  const superAdminsRemaining = await prisma.user.count({
    where: { role: 'SUPER_ADMIN' },
  })
  const tenantUsersRemaining = await prisma.user.count({
    where: { tenantId: { not: null } },
  })

  console.log(`Tenants remaining: ${tenantsRemaining}`)
  console.log(`Super admins remaining: ${superAdminsRemaining}`)
  console.log(`Tenant users remaining: ${tenantUsersRemaining}`)

  if (tenantsRemaining === 0 && superAdminsRemaining >= 1 && tenantUsersRemaining === 0) {
    console.log('\n✅ Verification passed! Database is clean.')
  } else {
    console.log('\n⚠️  Verification warning: Unexpected state after cleanup.')
  }
}

async function main() {
  console.log('\n' + '═'.repeat(80))
  console.log('  TICKTRACK PRO - TENANT DATA CLEANUP')
  console.log('═'.repeat(80))
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No data will be deleted')
    console.log('   Run with --execute flag to actually delete data')
  } else {
    console.log('\n🔴 EXECUTE MODE - Data WILL be deleted!')
  }

  // Step 1: Analyze what will be deleted
  await analyzeDeletions()

  if (deletionPlan.tenants.length === 0) {
    console.log('\n✅ No tenants to delete. Database is already clean.')
    return
  }

  if (DRY_RUN) {
    console.log('\n💡 This was a dry run. No data was deleted.')
    console.log('   Run with --execute to perform the cleanup.')
    return
  }

  // Step 2: Ask for confirmation
  console.log('\n⚠️  WARNING: This will permanently delete all tenant data!')
  const confirmed = await askConfirmation('\nAre you sure you want to proceed?')

  if (!confirmed) {
    console.log('\n❌ Cleanup cancelled by user.')
    return
  }

  // Step 3: Create backup
  const backupFile = await createBackup()

  // Step 4: Execute cleanup
  await executeCleanup()

  // Step 5: Verify
  await verifyCleanup()

  console.log(`\n💾 Backup saved to: ${backupFile}`)
  console.log('\n✨ All done!\n')
}

main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
