import { NextRequest } from 'next/server'

/**
 * PAGINATION UTILITIES (BACKWARD COMPATIBLE)
 * ===========================================
 * - Optional pagination via query params
 * - Preserves existing behavior when params absent
 * - Safe limits to prevent abuse
 * - Stable sorting for consistency
 */

const PAGINATION_ENABLED = process.env.ENABLE_PAGINATION === 'true'
const DEFAULT_LIMIT = parseInt(process.env.PAGINATION_DEFAULT_LIMIT || '50')
const MAX_LIMIT = parseInt(process.env.PAGINATION_MAX_LIMIT || '100')

export interface PaginationParams {
  page: number
  limit: number
  skip: number
  isPaginated: boolean // Flag to determine if pagination was requested
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * Extract pagination parameters from request
 * If no pagination params provided, returns flag indicating no pagination
 */
export function getPaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url)

  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit')

  // If neither param is provided, indicate no pagination requested
  const isPaginated = PAGINATION_ENABLED && (pageParam !== null || limitParam !== null)

  if (!isPaginated) {
    return {
      page: 1,
      limit: DEFAULT_LIMIT,
      skip: 0,
      isPaginated: false,
    }
  }

  // Parse and validate pagination parameters
  const page = Math.max(1, parseInt(pageParam || '1'))
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limitParam || DEFAULT_LIMIT.toString())))
  const skip = (page - 1) * limit

  return {
    page,
    limit,
    skip,
    isPaginated: true,
  }
}

/**
 * Build paginated response
 * Only includes meta when pagination was explicitly requested
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> | T[] {
  // If pagination wasn't requested, return array only (backward compatible)
  if (!params.isPaginated) {
    return data
  }

  // Return paginated format with metadata
  const totalPages = Math.ceil(total / params.limit)

  return {
    data,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
    },
  }
}

/**
 * Prisma pagination helper
 * Returns empty object if pagination not requested (preserves existing behavior)
 */
export function getPrismaPagination(params: PaginationParams) {
  if (!params.isPaginated) {
    return {}
  }

  return {
    skip: params.skip,
    take: params.limit,
  }
}

/**
 * Apply stable sorting to ensure consistent pagination
 * Adds secondary sort by 'id' or 'createdAt' if available
 */
export function getStableOrderBy<T extends Record<string, any>>(
  orderBy: T[] | T | undefined,
  fallbackField: keyof T = 'createdAt' as keyof T
): T[] {
  if (!orderBy) {
    return [{ [fallbackField]: 'desc' } as T]
  }

  const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy]

  // Check if sorting already includes id or createdAt
  const hasStableSort = orderByArray.some(
    (sort) => 'id' in sort || 'createdAt' in sort
  )

  if (hasStableSort) {
    return orderByArray
  }

  // Add stable sort as fallback
  return [...orderByArray, { [fallbackField]: 'desc' } as T]
}
