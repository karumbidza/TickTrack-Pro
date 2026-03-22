const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function showSuperAdmins() {
  try {
    const superAdmins = await prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        tenantId: true
      }
    })
    
    console.log('\n👑 SUPER ADMIN USERS:\n')
    console.log('═'.repeat(80))
    console.log('Total Super Admins:', superAdmins.length)
    console.log('═'.repeat(80), '\n')
    
    if (superAdmins.length === 0) {
      console.log('⚠️  WARNING: No super admin users found!\n')
      return
    }
    
    superAdmins.forEach((admin, idx) => {
      console.log(`${idx + 1}. ${admin.name || 'N/A'}`)
      console.log(`   Email: ${admin.email}`)
      console.log(`   ID: ${admin.id}`)
      console.log(`   Tenant ID: ${admin.tenantId || 'N/A (Global)'}`)
      console.log(`   Created: ${new Date(admin.createdAt).toLocaleDateString()}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('Error fetching super admins:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

showSuperAdmins()
