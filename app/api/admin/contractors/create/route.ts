import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure user has tenantId
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    const { name, email, phone, secondaryPhone } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    // Generate default password (contractor can change it later)
    const defaultPassword = 'contractor123'
    const hashedPassword = await bcrypt.hash(defaultPassword, 12)

    // Create contractor user
    const contractor = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'CONTRACTOR',
        tenantId: user.tenantId,
        isActive: true,
        phone: phone || null
      }
    })

    // Create contractor profile
    await prisma.contractor.create({
      data: {
        userId: contractor.id,
        tenantId: user.tenantId,
        specialties: [],
        status: 'AVAILABLE',
        secondaryPhone: secondaryPhone || null
      }
    })

    return NextResponse.json({ 
      message: 'Contractor created successfully',
      contractor: {
        id: contractor.id,
        name: contractor.name,
        email: contractor.email
      },
      defaultPassword
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create contractor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}