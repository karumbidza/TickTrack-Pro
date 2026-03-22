const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function showTenants() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            tickets: true,
            branches: true,
            assets: true,
            contractors: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('\n📊 TENANTS IN DATABASE:\n')
    console.log('═'.repeat(80))
    console.log('Total Tenants:', tenants.length)
    console.log('═'.repeat(80), '\n')
    
    if (tenants.length === 0) {
      console.log('No tenants found.\n')
      return
    }
    
    tenants.forEach((tenant, idx) => {
      console.log(`${idx + 1}. ${tenant.name}`)
      console.log(`   ID: ${tenant.id}`)
      console.log(`   Slug: ${tenant.slug}`)
      console.log(`   Status: ${tenant.status}`)
      console.log(`   Created: ${new Date(tenant.createdAt).toLocaleDateString()}`)
      console.log(`   📊 Data: ${tenant._count.users} users | ${tenant._count.tickets} tickets | ${tenant._count.contractors} contractors | ${tenant._count.branches} branches | ${tenant._count.assets} assets`)
      console.log('')
    })
    
  } catch (error) {
    console.error('Error fetching tenants:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

showTenants()
