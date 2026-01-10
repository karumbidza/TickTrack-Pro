import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get total tenant count
    const totalTenants = await prisma.tenant.count()
    
    // Get active tenant count (ACTIVE or TRIAL status)
    const activeTenants = await prisma.tenant.count({
      where: { 
        status: {
          in: ['ACTIVE', 'TRIAL']
        }
      }
    })
    
    // Get total user count
    const totalUsers = await prisma.user.count()
    
    // Calculate expiring soon (within 7 days)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    
    const expiringSoon = await prisma.tenant.count({
      where: {
        OR: [
          {
            trialEndsAt: {
              lte: sevenDaysFromNow,
              gte: new Date()
            }
          },
          {
            subscription: {
              currentPeriodEnd: {
                lte: sevenDaysFromNow,
                gte: new Date()
              }
            }
          }
        ]
      }
    })
    
    // Calculate revenue (mock for now, would integrate with Paynow)
    // For now, estimate revenue based on active subscriptions
    const revenue = activeTenants * 99 // Assuming $99/month per tenant

    return NextResponse.json({
      stats: {
        totalTenants,
        activeTenants,
        totalUsers,
        expiringSoon,
        revenue
      }
    })
  } catch (error) {
    console.error('Super admin stats fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}