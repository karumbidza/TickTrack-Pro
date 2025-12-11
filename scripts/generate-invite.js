const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

async function createInvitation() {
  const prisma = new PrismaClient();
  
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Get the first tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('No tenant found');
      return;
    }
    
    // Get an admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'TENANT_ADMIN' }
    });
    
    const invitation = await prisma.contractorInvitation.create({
      data: {
        email: 'test@example.com',
        token,
        expiresAt,
        tenantId: tenant.id,
        invitedBy: admin?.id || 'system'
      }
    });
    
    console.log('');
    console.log('✅ New Registration Link Created!');
    console.log('');
    console.log('http://localhost:3001/contractor-registration/' + token);
    console.log('');
    console.log('Expires:', expiresAt.toISOString());
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createInvitation();
