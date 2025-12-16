import { PrismaClient } from '@prisma/client';

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking database for data...\n');
    
    const users = await prisma.user.count();
    const tenants = await prisma.tenant.count();
    const tickets = await prisma.ticket.count();
    const assets = await prisma.asset.count();
    const branches = await prisma.branch.count();
    const assetCategories = await prisma.assetCategory.count();
    const contractors = await prisma.contractor.count();
    const subscriptions = await prisma.subscription.count();
    
    console.log('📊 Database Record Counts:');
    console.log('========================');
    console.log(`Users: ${users}`);
    console.log(`Tenants: ${tenants}`);
    console.log(`Tickets: ${tickets}`);
    console.log(`Assets: ${assets}`);
    console.log(`Branches: ${branches}`);
    console.log(`Asset Categories: ${assetCategories}`);
    console.log(`Contractors: ${contractors}`);
    console.log(`Subscriptions: ${subscriptions}`);
    
    const total = users + tenants + tickets + assets + branches + assetCategories + contractors + subscriptions;
    console.log(`\nTotal Records: ${total}`);
    
    if (total === 0) {
      console.log('\n❌ Database is empty. Consider running: npm run seed');
    } else {
      console.log('\n✅ Database contains data');
      
      // Show sample data if available
      if (users > 0) {
        console.log('\n📝 Sample Users:');
        const sampleUsers = await prisma.user.findMany({ take: 5, select: { email: true, name: true, role: true } });
        sampleUsers.forEach(user => console.log(`  - ${user.email} (${user.role})`));
      }
      
      if (tenants > 0) {
        console.log('\n🏢 Sample Tenants:');
        const sampleTenants = await prisma.tenant.findMany({ take: 5, select: { name: true, slug: true } });
        sampleTenants.forEach(tenant => console.log(`  - ${tenant.name} (${tenant.slug})`));
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
