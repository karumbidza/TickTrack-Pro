const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all tenants
  const tenants = await prisma.tenant.findMany({
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          isActive: true,
          createdAt: true
        }
      },
      subscription: true
    }
  });

  // Get super admins (no tenant)
  const superAdmins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      isActive: true,
      createdAt: true
    }
  });

  console.log('\n========================================');
  console.log('TICKTRACK PRO - ALL ACCOUNTS REPORT');
  console.log('========================================\n');

  console.log('📊 SUMMARY:');
  console.log('   Total Companies:', tenants.length);
  console.log('   Total Super Admins:', superAdmins.length);
  const totalUsers = tenants.reduce((sum, t) => sum + t.users.length, 0) + superAdmins.length;
  console.log('   Total Users:', totalUsers);

  console.log('\n========================================');
  console.log('🔑 SUPER ADMINS (Platform Level)');
  console.log('========================================');
  superAdmins.forEach(u => {
    console.log('   Email:', u.email);
    console.log('   Name:', u.name || 'N/A');
    console.log('   Status:', u.status, u.isActive ? '(Active)' : '(Inactive)');
    console.log('   ---');
  });

  console.log('\n========================================');
  console.log('🏢 COMPANIES & USERS');
  console.log('========================================');
  
  tenants.forEach((t, i) => {
    console.log('\n' + (i+1) + '. ' + t.name);
    console.log('   Slug:', t.slug);
    console.log('   Status:', t.status);
    console.log('   Trial Ends:', t.trialEndsAt ? t.trialEndsAt.toISOString().split('T')[0] : 'N/A');
    console.log('   Created:', t.createdAt.toISOString().split('T')[0]);
    console.log('   Users (' + t.users.length + '):');
    t.users.forEach(u => {
      console.log('      - ' + u.email);
      console.log('        Name: ' + (u.name || 'N/A') + ' | Role: ' + u.role + ' | Status: ' + u.status);
    });
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
