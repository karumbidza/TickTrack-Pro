import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')
  
  // Create super admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@ticktrackpro.com' },
    update: {},
    create: {
      email: 'admin@ticktrackpro.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })

  console.log('✅ Created Super Admin:', superAdmin.email)

  // Create a demo company
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      email: 'info@democompany.com',
      features: {
        chat: true,
        invoicing: true,
        inventory: false,
        projects: false
      },
      settings: {}
    },
  })

  console.log('✅ Created Demo Company:', demoTenant.name)

  // Create default branches for demo company
  const headOffice = await prisma.branch.upsert({
    where: { 
      tenantId_name: { tenantId: demoTenant.id, name: 'Head Office' }
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Head Office',
      address: '123 Main Street, City Center',
      type: 'HEAD_OFFICE',
      isHeadOffice: true,
      isActive: true,
      sortOrder: 0
    }
  })

  const branchA = await prisma.branch.upsert({
    where: { 
      tenantId_name: { tenantId: demoTenant.id, name: 'Branch A - North' }
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Branch A - North',
      address: '456 North Avenue',
      type: 'BRANCH',
      isHeadOffice: false,
      isActive: true,
      sortOrder: 1
    }
  })

  const branchB = await prisma.branch.upsert({
    where: { 
      tenantId_name: { tenantId: demoTenant.id, name: 'Branch B - South' }
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Branch B - South',
      address: '789 South Boulevard',
      type: 'BRANCH',
      isHeadOffice: false,
      isActive: true,
      sortOrder: 2
    }
  })

  console.log('✅ Created Branches: Head Office, Branch A, Branch B')

  // Create demo company admin
  const tenantAdminPassword = await bcrypt.hash('demo123', 10)
  
  const tenantAdmin = await prisma.user.upsert({
    where: { email: 'admin@democompany.com' },
    update: {},
    create: {
      email: 'admin@democompany.com',
      name: 'Demo Admin',
      password: tenantAdminPassword,
      role: 'TENANT_ADMIN',
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  console.log('✅ Created Company Admin:', tenantAdmin.email)

  // Create demo end user
  const endUserPassword = await bcrypt.hash('user123', 10)
  
  const endUser = await prisma.user.upsert({
    where: { email: 'user@democompany.com' },
    update: {},
    create: {
      email: 'user@democompany.com',
      name: 'Demo User',
      password: endUserPassword,
      role: 'END_USER',
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  console.log('✅ Created End User:', endUser.email)

  // Create contractor accounts linked to demo company
  const contractorPassword = await bcrypt.hash('contractor123', 10)
  
  const contractor1 = await prisma.user.upsert({
    where: { email: 'contractor1@freelance.com' },
    update: {},
    create: {
      email: 'contractor1@freelance.com',
      name: 'John Smith',
      password: contractorPassword,
      role: 'CONTRACTOR',
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  console.log('✅ Created Contractor 1:', contractor1.email)

  // Create contractor profile for John Smith
  await prisma.contractor.upsert({
    where: { userId: contractor1.id },
    update: {},
    create: {
      userId: contractor1.id,
      tenantId: demoTenant.id,
      specialties: ['Plumbing', 'General Maintenance', 'HVAC'],
      hourlyRate: 75.0,
      rating: 4.8,
      status: 'AVAILABLE'
    }
  })

  const contractor2 = await prisma.user.upsert({
    where: { email: 'contractor2@services.com' },
    update: {},
    create: {
      email: 'contractor2@services.com',
      name: 'Sarah Johnson',
      password: contractorPassword,
      role: 'CONTRACTOR',
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  console.log('✅ Created Contractor 2:', contractor2.email)

  // Create contractor profile for Sarah Johnson
  await prisma.contractor.upsert({
    where: { userId: contractor2.id },
    update: {},
    create: {
      userId: contractor2.id,
      tenantId: demoTenant.id,
      specialties: ['Electrical', 'IT Support', 'Network Setup'],
      hourlyRate: 85.0,
      rating: 4.9,
      status: 'AVAILABLE'
    }
  })

  // Assign users to branches
  // Admin gets Head Office (which means all branches access)
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: tenantAdmin.id, branchId: headOffice.id } },
    update: {},
    create: {
      userId: tenantAdmin.id,
      branchId: headOffice.id
    }
  })
  // Also assign admin to all branches for completeness
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: tenantAdmin.id, branchId: branchA.id } },
    update: {},
    create: {
      userId: tenantAdmin.id,
      branchId: branchA.id
    }
  })
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: tenantAdmin.id, branchId: branchB.id } },
    update: {},
    create: {
      userId: tenantAdmin.id,
      branchId: branchB.id
    }
  })

  // End user assigned to Branch A
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: endUser.id, branchId: branchA.id } },
    update: {},
    create: {
      userId: endUser.id,
      branchId: branchA.id
    }
  })

  console.log('✅ Assigned users to branches')

  // Create default asset categories for demo company
  const defaultCategories = [
    { name: 'Plumbing', description: 'Water systems, pipes, fixtures, and drainage', color: '#3B82F6' },
    { name: 'Electrical', description: 'Electrical systems, wiring, and power equipment', color: '#F59E0B' },
    { name: 'HVAC', description: 'Heating, ventilation, and air conditioning systems', color: '#10B981' },
    { name: 'Refrigeration', description: 'Cooling and refrigeration equipment', color: '#06B6D4' },
    { name: 'Generators', description: 'Power generators and backup systems', color: '#8B5CF6' },
    { name: 'Civil Works', description: 'Building structures, foundations, and construction', color: '#6B7280' },
    { name: 'Painting', description: 'Interior and exterior painting services', color: '#EC4899' },
    { name: 'Carpentry', description: 'Woodwork, furniture, and fixtures', color: '#78350F' },
    { name: 'Security Systems', description: 'CCTV, access control, and alarm systems', color: '#EF4444' },
    { name: 'Fire Safety', description: 'Fire suppression, alarms, and safety equipment', color: '#DC2626' },
    { name: 'IT/Networking', description: 'Computer networks, servers, and IT infrastructure', color: '#0EA5E9' },
    { name: 'Landscaping', description: 'Garden maintenance and outdoor spaces', color: '#22C55E' },
    { name: 'Cleaning Services', description: 'Janitorial and specialized cleaning', color: '#A855F7' },
    { name: 'Fuel Systems', description: 'Fuel storage, dispensing, and related equipment', color: '#F97316' },
    { name: 'Solar Installation', description: 'Solar panels and renewable energy systems', color: '#FACC15' },
  ]

  for (let i = 0; i < defaultCategories.length; i++) {
    const cat = defaultCategories[i]
    await prisma.assetCategory.upsert({
      where: { tenantId_name: { tenantId: demoTenant.id, name: cat.name } },
      update: {},
      create: {
        tenantId: demoTenant.id,
        name: cat.name,
        description: cat.description,
        color: cat.color,
        sortOrder: i + 1,
        isActive: true
      }
    })
  }

  console.log('✅ Created default asset categories')

  console.log('\n🎉 Database seeded successfully!')
  console.log('\nYou can now sign in with:')
  console.log('• Super Admin: admin@ticktrackpro.com / admin123')
  console.log('• Demo Admin: admin@democompany.com / admin123')
  console.log('• End User: user@democompany.com / user123')
  console.log('• Contractor 1: contractor1@freelance.com / contractor123')
  console.log('• Contractor 2: contractor2@services.com / contractor123')
  console.log('• Company Admin: admin@democompany.com / demo123')
  console.log('• End User: user@democompany.com / user123')
  console.log('• Contractor 1: contractor1@freelance.com / contractor123')
  console.log('• Contractor 2: contractor2@services.com / contractor123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })