import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, tenantId, role } = authCtx

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const skip = (page - 1) * limit

    const whereClause: any = {
      userId: userId
    }

    if (unreadOnly) {
      whereClause.read = false
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: {
          userId: userId,
          read: false
        }
      })
    ])

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, tenantId, role } = authCtx

    const { notificationIds, markAllRead } = await request.json()

    if (markAllRead) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: {
          userId: userId,
          read: false
        },
        data: { read: true }
      })
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: userId
        },
        data: { read: true }
      })
    } else {
      return NextResponse.json(
        { error: 'Either notificationIds or markAllRead is required' },
        { status: 400 }
      )
    }

    // Get updated unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId: userId,
        read: false
      }
    })

    return NextResponse.json({ success: true, unreadCount })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}

// DELETE - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, tenantId, role } = authCtx

    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')
    const deleteAll = searchParams.get('deleteAll') === 'true'

    if (deleteAll) {
      await prisma.notification.deleteMany({
        where: { userId: userId }
      })
    } else if (notificationId) {
      await prisma.notification.delete({
        where: {
          id: notificationId,
          userId: userId
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Either id or deleteAll is required' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notifications:', error)
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    )
  }
}
