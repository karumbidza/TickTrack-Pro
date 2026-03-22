const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting all tenants and their data...');
  
  // Delete in correct order due to foreign keys
  await prisma.userBranch.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.rating.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.quoteRequest.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.assetCategory.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.contractorCategory.deleteMany({});
  await prisma.contractorKYC.deleteMany({});
  await prisma.contractor.deleteMany({});
  await prisma.userInvitation.deleteMany({});
  await prisma.contractorInvitation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.quote.deleteMany({});
  await prisma.paymentBatch.deleteMany({});
  
  // Delete tenant users (not super admins)
  await prisma.user.deleteMany({ where: { role: { not: 'SUPER_ADMIN' } } });
  
  // Delete tenants
  const deleted = await prisma.tenant.deleteMany({});
  console.log('✅ Deleted', deleted.count, 'tenants');
  
  // Create test company
  console.log('\n🏢 Creating test company...');
  
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Company',
      slug: 'demo-company',
      email: 'demo@ticktrackpro.com',
      status: 'TRIAL',
      trialEndsAt: trialEndsAt,
      settings: { companySize: '11-50', onboardingCompleted: false }
    }
  });
  
  // Create subscription
  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: 'PRO',
      status: 'TRIAL',
      amount: 0,
      trialEndsAt: trialEndsAt,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt
    }
  });
  
  // Create admin user with known password
  const hashedPassword = await bcrypt.hash('Demo@2026', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      name: 'Demo Admin',
      password: hashedPassword,
      role: 'TENANT_ADMIN',
      tenantId: tenant.id,
      status: 'ACTIVE',
      isActive: true,
      emailVerified: new Date()
    }
  });
  
  // Create a default branch
  await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'Head Office',
      type: 'HEAD_OFFICE',
      isHeadOffice: true,
      address: '123 Demo Street, Harare'
    }
  });
  
  console.log('✅ Test company created!');
  console.log('\n========================================');
  console.log('🔐 TEST ACCOUNT LOGIN DETAILS');
  console.log('========================================');
  console.log('Company: Demo Company');
  console.log('Email: admin@demo.com');
  console.log('Password: Demo@2026');
  console.log('Trial Ends:', trialEndsAt.toISOString().split('T')[0]);
  console.log('========================================');
  console.log('\n🌐 Login at: https://tick-trackpro.com/auth/signin');
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
