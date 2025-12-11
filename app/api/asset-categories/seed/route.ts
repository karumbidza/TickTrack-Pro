import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Default categories that can be seeded for new tenants
const DEFAULT_CATEGORIES = [
  { name: 'Vehicles', description: 'Cars, trucks, motorcycles, and other vehicles', icon: 'car', color: '#3B82F6' },
  { name: 'Machinery', description: 'Industrial machinery and heavy equipment', icon: 'cog', color: '#6B7280' },
  { name: 'IT Equipment', description: 'Computers, servers, networking equipment', icon: 'computer', color: '#8B5CF6' },
  { name: 'HVAC', description: 'Heating, ventilation, and air conditioning systems', icon: 'thermometer', color: '#10B981' },
  { name: 'Electrical', description: 'Electrical systems and equipment', icon: 'zap', color: '#F59E0B' },
  { name: 'Plumbing', description: 'Plumbing systems and fixtures', icon: 'droplet', color: '#06B6D4' },
  { name: 'Furniture', description: 'Office and facility furniture', icon: 'armchair', color: '#EC4899' },
  { name: 'Safety Equipment', description: 'Fire extinguishers, alarms, and safety gear', icon: 'shield', color: '#EF4444' },
  { name: 'Tools', description: 'Hand tools and power tools', icon: 'wrench', color: '#78716C' },
  { name: 'Other', description: 'Miscellaneous assets', icon: 'box', color: '#9CA3AF' },
]

// Industry-specific category templates
const INDUSTRY_TEMPLATES: Record<string, Array<{ name: string; description: string; icon: string; color: string }>> = {
  transport: [
    { name: 'Trucks', description: 'Heavy-duty trucks and lorries', icon: 'truck', color: '#3B82F6' },
    { name: 'Buses', description: 'Passenger buses and coaches', icon: 'bus', color: '#10B981' },
    { name: 'Light Vehicles', description: 'Cars, vans, and pickups', icon: 'car', color: '#6366F1' },
    { name: 'Trailers', description: 'Trailers and semi-trailers', icon: 'container', color: '#8B5CF6' },
    { name: 'Forklifts', description: 'Warehouse forklifts and loaders', icon: 'forklift', color: '#F59E0B' },
  ],
  fuel: [
    { name: 'Fuel Tanks', description: 'Underground and above-ground storage tanks', icon: 'fuel', color: '#EF4444' },
    { name: 'Dispensers', description: 'Fuel pumps and dispensers', icon: 'gauge', color: '#3B82F6' },
    { name: 'Point of Sale', description: 'POS systems and terminals', icon: 'credit-card', color: '#10B981' },
    { name: 'Canopy & Signage', description: 'Station canopy and brand signage', icon: 'building', color: '#6B7280' },
    { name: 'Safety Systems', description: 'Fire suppression and safety equipment', icon: 'shield', color: '#F59E0B' },
  ],
  farming: [
    { name: 'Tractors', description: 'Tractors and farm vehicles', icon: 'tractor', color: '#22C55E' },
    { name: 'Harvesters', description: 'Combine harvesters and threshers', icon: 'wheat', color: '#F59E0B' },
    { name: 'Irrigation', description: 'Irrigation systems and pumps', icon: 'droplet', color: '#06B6D4' },
    { name: 'Storage', description: 'Silos, barns, and cold storage', icon: 'warehouse', color: '#8B5CF6' },
    { name: 'Livestock Equipment', description: 'Feeding systems and animal handling', icon: 'cow', color: '#EC4899' },
    { name: 'Implements', description: 'Ploughs, planters, and sprayers', icon: 'tool', color: '#78716C' },
  ],
  garage: [
    { name: 'Lifts & Hoists', description: 'Vehicle lifts and hoisting equipment', icon: 'arrow-up', color: '#3B82F6' },
    { name: 'Diagnostic Equipment', description: 'OBD scanners and diagnostic tools', icon: 'scan', color: '#8B5CF6' },
    { name: 'Compressors', description: 'Air compressors and pneumatic tools', icon: 'wind', color: '#6B7280' },
    { name: 'Welding Equipment', description: 'Welders and cutting equipment', icon: 'flame', color: '#EF4444' },
    { name: 'Alignment Systems', description: 'Wheel alignment and balancing', icon: 'circle', color: '#10B981' },
    { name: 'Wash Bay', description: 'Car wash and detailing equipment', icon: 'droplet', color: '#06B6D4' },
  ],
  government: [
    { name: 'Fleet Vehicles', description: 'Government fleet vehicles', icon: 'car', color: '#3B82F6' },
    { name: 'Office Equipment', description: 'Printers, copiers, and office machines', icon: 'printer', color: '#6B7280' },
    { name: 'IT Infrastructure', description: 'Servers, networks, and computers', icon: 'server', color: '#8B5CF6' },
    { name: 'Building Systems', description: 'HVAC, elevators, and building automation', icon: 'building', color: '#10B981' },
    { name: 'Security Systems', description: 'CCTV, access control, and alarms', icon: 'shield', color: '#EF4444' },
    { name: 'Public Infrastructure', description: 'Roads, bridges, and public facilities', icon: 'landmark', color: '#F59E0B' },
  ],
}

// POST - Seed default categories for a tenant
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminRoles = ['TENANT_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Only tenant admins can seed categories' }, { status: 403 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
    }

    const { industry } = await request.json()

    // Check if tenant already has categories
    const existingCount = await prisma.assetCategory.count({
      where: { tenantId }
    })

    if (existingCount > 0) {
      return NextResponse.json({ 
        error: 'Categories already exist. Delete existing categories first or add new ones individually.' 
      }, { status: 400 })
    }

    // Get the appropriate template
    let categoriesToCreate = DEFAULT_CATEGORIES
    if (industry && INDUSTRY_TEMPLATES[industry.toLowerCase()]) {
      categoriesToCreate = INDUSTRY_TEMPLATES[industry.toLowerCase()]
    }

    // Create categories
    const createdCategories = await prisma.assetCategory.createMany({
      data: categoriesToCreate.map((cat, index) => ({
        tenantId,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
        sortOrder: index + 1
      }))
    })

    logger.info('Default categories seeded:', { 
      tenantId, 
      count: createdCategories.count, 
      industry: industry || 'default' 
    })

    // Fetch and return the created categories
    const categories = await prisma.assetCategory.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({ 
      message: `${createdCategories.count} categories created successfully`,
      categories 
    }, { status: 201 })
  } catch (error) {
    logger.error('Error seeding asset categories:', error)
    return NextResponse.json({ error: 'Failed to seed categories' }, { status: 500 })
  }
}

// GET - Get available industry templates
export async function GET() {
  return NextResponse.json({
    industries: Object.keys(INDUSTRY_TEMPLATES),
    templates: {
      default: DEFAULT_CATEGORIES.map(c => c.name),
      ...Object.fromEntries(
        Object.entries(INDUSTRY_TEMPLATES).map(([key, cats]) => [
          key, 
          cats.map(c => c.name)
        ])
      )
    }
  })
}
