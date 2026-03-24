import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logger, generateRequestId } from '@/lib/async-logger'
import { withCache, CacheInvalidation } from '@/lib/cache-middleware'
import { CACHE_TTL } from '@/lib/redis'
import {
  getPaginationParams,
  buildPaginatedResponse,
} from '@/lib/pagination'
import { metrics } from '@/lib/metrics'

/**
 * OPTIMIZED TICKETS API ROUTE
 * ============================
 * Performance enhancements:
 * - Redis caching with cache-aside pattern
 * - Backward-compatible pagination
 * - Asynchronous logging
 * - Request tracking with correlation IDs
 * - Metrics collection
 *
 * BACKWARD COMPATIBLE:
 * - Without pagination params: Returns { tickets, pagination } (existing format)
 * - With pagination params: Returns { data, meta } OR { tickets, pagination }
 * - All existing clients continue to work unchanged
 */

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  const requestLogger = logger.withRequest(requestId)
  const startTime = Date.now()

  try {
    // Wrap with cache middleware
    return await withCache(
      request,
      async () => {
        const { userId: clerkUserId, sessionClaims } = await auth()
        if (!clerkUserId) {
          requestLogger.warn('Unauthorized access attempt')
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
        const userId = meta.dbUserId ?? clerkUserId
        const tenantId = meta.tenantId ?? null
        const role = (meta.role as string) ?? 'END_USER'

        const user = { id: userId, tenantId, role }

        const allowedRoles = [
          'TENANT_ADMIN',
          'IT_ADMIN',
          'SALES_ADMIN',
          'RETAIL_ADMIN',
          'MAINTENANCE_ADMIN',
          'PROJECTS_ADMIN',
        ]

        if (!allowedRoles.includes(user.role)) {
          requestLogger.warn(`Forbidden access by role: ${user.role}`)
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (!user.tenantId) {
          requestLogger.error('User missing tenantId')
          return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
        }

        // Get pagination parameters (backward compatible)
        const paginationParams = getPaginationParams(request)

        requestLogger.debug(
          `Fetching tickets for tenant ${user.tenantId}, paginated: ${paginationParams.isPaginated}`
        )

        // Filter tickets based on admin role
        let departmentFilter = {}
        if (user.role === 'IT_ADMIN') {
          departmentFilter = { department: 'IT' }
        } else if (user.role === 'SALES_ADMIN') {
          departmentFilter = { department: 'SALES' }
        } else if (user.role === 'MAINTENANCE_ADMIN') {
          departmentFilter = { department: 'MAINTENANCE' }
        }

        const whereClause = {
          tenantId: user.tenantId,
          ...departmentFilter,
        }

        // Run count and data query in parallel
        const [tickets, total] = await Promise.all([
          prisma.ticket.findMany({
            where: whereClause,
            skip: paginationParams.isPaginated ? paginationParams.skip : undefined,
            take: paginationParams.isPaginated ? paginationParams.limit : undefined,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              asset: {
                select: {
                  id: true,
                  name: true,
                  assetNumber: true,
                  location: true,
                },
              },
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
              attachments: {
                select: {
                  id: true,
                  filename: true,
                  originalName: true,
                  url: true,
                  mimeType: true,
                },
              },
              invoices: {
                where: { isActive: true },
                select: {
                  id: true,
                  invoiceNumber: true,
                  amount: true,
                  status: true,
                  invoiceFileUrl: true,
                },
                take: 1,
              },
              _count: {
                select: {
                  messages: true,
                },
              },
            },
            // Stable sorting for consistent pagination
            orderBy: { createdAt: 'desc' as const },
          }),
          prisma.ticket.count({ where: whereClause }),
        ])

        // Build response based on pagination request
        const responseData = paginationParams.isPaginated
          ? buildPaginatedResponse(tickets, total, paginationParams)
          : {
              // Backward compatible format
              tickets,
              pagination: {
                page: paginationParams.page,
                limit: paginationParams.limit,
                total,
                totalPages: Math.ceil(total / paginationParams.limit),
              },
            }

        const responseTime = Date.now() - startTime
        metrics.recordRequest(responseTime)

        requestLogger.info(
          `Fetched ${tickets.length} tickets in ${responseTime}ms`
        )

        return NextResponse.json(responseData, { status: 200 })
      },
      {
        ttl: CACHE_TTL.TICKETS,
        keyPrefix: 'tickets',
        includeAuth: true,
      }
    )
  } catch (error) {
    const responseTime = Date.now() - startTime
    metrics.recordRequest(responseTime)

    requestLogger.error('Failed to fetch admin tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create new ticket
 * Invalidates relevant caches on creation
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const requestLogger = logger.withRequest(requestId)

  try {
    const { userId: clerkUserId, sessionClaims } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
    const userId = meta.dbUserId ?? clerkUserId
    const tenantId = meta.tenantId ?? null

    const body = await request.json()

    // Create ticket (existing logic preserved)
    const ticket = await prisma.ticket.create({
      data: {
        ...body,
        tenantId,
        userId,
      },
    })

    // Invalidate caches asynchronously (non-blocking)
    setImmediate(async () => {
      await CacheInvalidation.tickets(tenantId || undefined)
      await CacheInvalidation.stats(tenantId || undefined)
    })

    requestLogger.info(`Ticket created: ${ticket.id}`)

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    requestLogger.error('Failed to create ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
