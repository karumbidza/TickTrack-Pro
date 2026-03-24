import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx || authCtx.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const totalTenants = await prisma.tenant.count()
    const activeTenants = await prisma.tenant.count({ where: { status: { in: ['ACTIVE', 'TRIAL'] } } })
    const totalUsers = await prisma.user.count()

    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const expiringSoon = await prisma.tenant.count({
      where: {
        OR: [
          { trialEndsAt: { lte: sevenDaysFromNow, gte: new Date() } },
          { subscription: { currentPeriodEnd: { lte: sevenDaysFromNow, gte: new Date() } } },
        ],
      },
    })

    const revenue = activeTenants * 99

    return NextResponse.json({ stats: { totalTenants, activeTenants, totalUsers, expiringSoon, revenue } })
  } catch (error) {
    console.error('Super admin stats fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
