/**
 * Create (or repair) a known-password test user for mobile app testing.
 *
 * The mobile app authenticates via Clerk password sign-in, but the app's
 * normal flow provisions users through email activation (no password set
 * locally). This script creates a Clerk user WITH a password and a verified
 * email, then links a matching DB user under the Demo Company tenant so the
 * mobile password flow completes without any web verification step.
 *
 * Usage:  node scripts/create-test-mobile-user.js
 * Idempotent: re-running resets the password and re-links the accounts.
 */
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { PrismaClient } = require('@prisma/client')
const { createClerkClient } = require('@clerk/backend')

// ---- test account details -------------------------------------------------
// A Clerk "+clerk_test" email works without a real inbox: on development
// instances any emailed verification code is the fixed value 424242. This lets
// the mobile email-code 2FA step complete during testing.
const EMAIL = 'end.user+clerk_test@example.com'
const PASSWORD = 'TickTrackDemo2026!'
const FIRST = 'Demo'
const LAST = 'End User'
const ROLE = 'END_USER'
const TENANT_SLUG = 'demo-company'
// ---------------------------------------------------------------------------

const prisma = new PrismaClient()

async function main() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY missing (expected in .env.local)')
  }
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  // 1. Resolve tenant + a branch to assign the user to.
  const tenant = await prisma.tenant.findUnique({
    where: { slug: TENANT_SLUG },
    include: { branches: true },
  })
  if (!tenant) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
  const branch = tenant.branches.find((b) => b.isHeadOffice) || tenant.branches[0]

  // 2. Create the Clerk user, or reuse + reset password if it already exists.
  let clerkUser
  const existing = await clerk.users.getUserList({ emailAddress: [EMAIL] })
  if (existing.data.length > 0) {
    clerkUser = existing.data[0]
    await clerk.users.updateUser(clerkUser.id, {
      password: PASSWORD,
      skipPasswordChecks: true,
    })
    console.log('↻ Reused Clerk user and reset password:', clerkUser.id)
  } else {
    clerkUser = await clerk.users.createUser({
      emailAddress: [EMAIL],
      password: PASSWORD,
      firstName: FIRST,
      lastName: LAST,
      skipPasswordChecks: true,
    })
    console.log('✅ Created Clerk user:', clerkUser.id)
  }

  // 3. Upsert the linked DB user.
  const dbUser = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      clerkId: clerkUser.id,
      name: `${FIRST} ${LAST}`,
      role: ROLE,
      tenantId: tenant.id,
      status: 'ACTIVE',
      isActive: true,
      emailVerified: new Date(),
    },
    create: {
      clerkId: clerkUser.id,
      email: EMAIL,
      name: `${FIRST} ${LAST}`,
      role: ROLE,
      tenantId: tenant.id,
      status: 'ACTIVE',
      isActive: true,
      emailVerified: new Date(),
    },
  })
  console.log('✅ Linked DB user:', dbUser.id)

  // 4. Assign to a branch (ticket creation needs one).
  if (branch) {
    await prisma.userBranch.upsert({
      where: { userId_branchId: { userId: dbUser.id, branchId: branch.id } },
      update: {},
      create: { userId: dbUser.id, branchId: branch.id },
    })
    console.log('✅ Assigned to branch:', branch.name)
  } else {
    console.log('⚠️  Tenant has no branches — skipped branch assignment')
  }

  console.log('\n========================================')
  console.log('📱 MOBILE TEST LOGIN')
  console.log('========================================')
  console.log('Email:   ', EMAIL)
  console.log('Password:', PASSWORD)
  console.log('Role:    ', ROLE)
  console.log('Tenant:  ', tenant.name)
  console.log('========================================')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ FAILED:', e?.errors ?? e?.message ?? e)
    await prisma.$disconnect()
    process.exit(1)
  })
