/**
 * CENTRALIZED VALIDATION SCHEMAS
 * ===============================
 * Zod schemas for input validation across API routes.
 * Import these to validate request bodies consistently.
 */

import { z } from 'zod'

// ==================== COMMON SCHEMAS ====================

export const idSchema = z.string().cuid('Invalid ID format')

export const emailSchema = z.string().email('Invalid email address').toLowerCase().trim()

export const phoneSchema = z.string()
  .min(10, 'Phone number too short')
  .max(20, 'Phone number too long')
  .regex(/^[+]?[\d\s()-]+$/, 'Invalid phone number format')

export const passwordSchema = z.string()
  .min(6, 'Password must be at least 6 characters')
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character')

// ==================== PAGINATION ====================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ==================== USER SCHEMAS ====================

export const userCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
  role: z.enum(['END_USER', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']).optional(),
  branchIds: z.array(z.string().cuid()).optional(),
})

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  role: z.enum(['END_USER', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']).optional(),
  isActive: z.boolean().optional(),
  branchIds: z.array(z.string().cuid()).optional(),
})

// ==================== TICKET SCHEMAS ====================

export const ticketCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().min(1, 'Description is required').max(5000).trim(),
  type: z.enum(['REPAIR', 'MAINTENANCE', 'INSPECTION', 'INSTALLATION', 'REPLACEMENT', 'EMERGENCY', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  categoryId: z.string().cuid().optional(),
  assetId: z.string().cuid().optional(),
  branchId: z.string().cuid().optional(),
})

export const ticketUpdateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().min(1).max(5000).trim().optional(),
  type: z.enum(['REPAIR', 'MAINTENANCE', 'INSPECTION', 'INSTALLATION', 'REPLACEMENT', 'EMERGENCY', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum([
    'OPEN', 'AWAITING_QUOTE', 'QUOTE_SUBMITTED', 'PROCESSING', 'ACCEPTED',
    'IN_PROGRESS', 'ON_SITE', 'AWAITING_DESCRIPTION', 'AWAITING_WORK_APPROVAL',
    'AWAITING_APPROVAL', 'COMPLETED', 'CLOSED', 'CANCELLED'
  ]).optional(),
})

export const ticketStatusSchema = z.object({
  status: z.enum([
    'OPEN', 'AWAITING_QUOTE', 'QUOTE_SUBMITTED', 'PROCESSING', 'ACCEPTED',
    'IN_PROGRESS', 'ON_SITE', 'AWAITING_DESCRIPTION', 'AWAITING_WORK_APPROVAL',
    'AWAITING_APPROVAL', 'COMPLETED', 'CLOSED', 'CANCELLED'
  ]),
  comment: z.string().max(1000).optional(),
})

// ==================== MESSAGE SCHEMAS ====================

export const messageCreateSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000),
  isInternal: z.boolean().default(false),
})

// ==================== INVOICE SCHEMAS ====================

export const invoiceCreateSchema = z.object({
  ticketId: z.string().cuid('Invalid ticket ID'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1).max(2000).optional(),
  invoiceNumber: z.string().min(1).max(50).optional(),
  dueDate: z.string().datetime().optional(),
})

// ==================== CONTRACTOR SCHEMAS ====================

export const contractorRegistrationSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200).trim(),
  contactName: z.string().min(1, 'Contact name is required').max(100).trim(),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().min(1).max(500).optional(),
  categoryIds: z.array(z.string().cuid()).min(1, 'Select at least one category'),
})

export const quoteSubmitSchema = z.object({
  amount: z.number().positive('Quote amount must be positive'),
  description: z.string().min(1, 'Description is required').max(2000),
  estimatedDuration: z.string().max(100).optional(),
  validUntil: z.string().datetime().optional(),
})

// ==================== ASSET SCHEMAS ====================

export const assetCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  description: z.string().max(2000).optional(),
  categoryId: z.string().cuid('Invalid category').optional(),
  branchId: z.string().cuid('Invalid branch').optional(),
  serialNumber: z.string().max(100).optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED', 'REPAIR_NEEDED', 'DECOMMISSIONED', 'TRANSFERRED', 'PENDING_DECOMMISSION']).default('ACTIVE'),
})

// ==================== BRANCH SCHEMAS ====================

export const branchCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  address: z.string().max(500).optional(),
  type: z.enum(['HEAD_OFFICE', 'BRANCH', 'SITE', 'WAREHOUSE', 'DEPOT', 'OTHER']).default('BRANCH'),
  isHeadOffice: z.boolean().default(false),
})

// ==================== CATEGORY SCHEMAS ====================

export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
})

// ==================== HELPER FUNCTIONS ====================

/**
 * Safely parse and validate request body
 * Returns { success: true, data } or { success: false, error }
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): 
  { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: messages }
    }
    return { success: false, error: 'Invalid request data' }
  }
}

/**
 * Validate query parameters for pagination
 */
export function validatePagination(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    skip: (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit)),
  }
}

/**
 * Sanitize string input - remove dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
}
