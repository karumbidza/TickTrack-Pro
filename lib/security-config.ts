/**
 * SECURITY CONFIGURATION
 * ======================
 * Centralized security settings for NASA-grade protection.
 * All security parameters in one place for easy auditing and updates.
 */

// ============================================
// SESSION & AUTHENTICATION
// ============================================

export const AUTH_CONFIG = {
  // JWT session lifetime
  session: {
    maxAgeSeconds: 8 * 60 * 60, // 8 hours
    updateAgeSeconds: 60 * 60, // 1 hour sliding window
  },

  // Password requirements
  password: {
    minLength: 6,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
    specialChars: '@$!%*?&#^()_+-=[]{}|;:,.<>',
  },

  // Account lockout (after failed attempts)
  lockout: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
  },

  // OTP settings
  otp: {
    length: 6,
    expiryMinutes: 10,
    maxAttempts: 3,
  },

  // Token expiry
  tokens: {
    passwordResetExpiryHours: 24,
    accountActivationExpiryHours: 48,
    inviteExpiryDays: 7,
  },
}

// ============================================
// RATE LIMITING
// ============================================

export const RATE_LIMITS = {
  // Auth endpoints (strict)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },

  // General API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },

  // File uploads
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },

  // Password reset / OTP
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },
}

// ============================================
// FILE UPLOAD SECURITY
// ============================================

export const UPLOAD_CONFIG = {
  // Maximum file sizes
  maxFileSizes: {
    image: 10 * 1024 * 1024, // 10MB
    document: 25 * 1024 * 1024, // 25MB
    video: 100 * 1024 * 1024, // 100MB
    default: 50 * 1024 * 1024, // 50MB
  },

  // Allowed MIME types
  allowedMimeTypes: {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    videos: ['video/mp4', 'video/webm', 'video/quicktime'],
  },

  // Blocked file extensions (security)
  blockedExtensions: [
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js',
    '.jar', '.msi', '.dll', '.scr', '.pif', '.com',
    '.php', '.asp', '.aspx', '.jsp', '.cgi',
  ],
}

// ============================================
// REQUEST TIMEOUTS
// ============================================

export const TIMEOUTS = {
  // Database queries
  database: {
    defaultQueryMs: 30000, // 30 seconds
    transactionMs: 60000, // 60 seconds
    healthCheckMs: 5000, // 5 seconds
  },

  // External services
  external: {
    emailMs: 30000, // 30 seconds
    smsMs: 15000, // 15 seconds
    storageMs: 60000, // 60 seconds (for large uploads)
    paymentMs: 30000, // 30 seconds
  },

  // HTTP requests
  http: {
    connectTimeoutMs: 10000, // 10 seconds
    requestTimeoutMs: 30000, // 30 seconds
  },
}

// ============================================
// SECURITY HEADERS
// ============================================

export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

// ============================================
// INPUT VALIDATION
// ============================================

export const VALIDATION_LIMITS = {
  // Text field limits
  text: {
    nameMinLength: 2,
    nameMaxLength: 100,
    emailMaxLength: 254,
    phoneMaxLength: 20,
    descriptionMaxLength: 5000,
    commentMaxLength: 2000,
  },

  // Pagination
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },

  // Search
  search: {
    minQueryLength: 2,
    maxQueryLength: 200,
  },
}

// ============================================
// LOGGING & AUDIT
// ============================================

export const AUDIT_CONFIG = {
  // Events to always log
  alwaysLog: [
    'login',
    'logout',
    'login_failed',
    'password_change',
    'role_change',
    'user_created',
    'user_deleted',
    'permission_change',
    'data_export',
    'bulk_operation',
  ],

  // Log retention (days)
  retentionDays: 90,

  // Sensitive fields to redact in logs
  sensitiveFields: [
    'password',
    'passwordHash',
    'token',
    'secret',
    'apiKey',
    'creditCard',
    'ssn',
    'otp',
  ],
}

// ============================================
// CORS & ORIGINS
// ============================================

export const CORS_CONFIG = {
  // Allowed origins in production
  allowedOrigins: [
    'https://tick-trackpro.com',
    'https://www.tick-trackpro.com',
  ],

  // Allowed methods
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],

  // Max age for preflight cache
  maxAge: 86400, // 24 hours
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a file type is allowed
 */
export function isAllowedFileType(mimeType: string, category: keyof typeof UPLOAD_CONFIG.allowedMimeTypes): boolean {
  const allowed = UPLOAD_CONFIG.allowedMimeTypes[category]
  return allowed.includes(mimeType)
}

/**
 * Check if file extension is blocked
 */
export function isBlockedExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return UPLOAD_CONFIG.blockedExtensions.includes(ext)
}

/**
 * Get max file size for a category
 */
export function getMaxFileSize(category: keyof typeof UPLOAD_CONFIG.maxFileSizes): number {
  return UPLOAD_CONFIG.maxFileSizes[category] || UPLOAD_CONFIG.maxFileSizes.default
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const config = AUTH_CONFIG.password

  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters`)
  }
  if (password.length > config.maxLength) {
    errors.push(`Password must be at most ${config.maxLength} characters`)
  }
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (config.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  if (config.requireSpecialChar) {
    const specialRegex = new RegExp(`[${config.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`)
    if (!specialRegex.test(password)) {
      errors.push('Password must contain at least one special character')
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Redact sensitive fields from an object (for logging)
 */
export function redactSensitive<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }

  for (const field of AUDIT_CONFIG.sensitiveFields) {
    if (field in result) {
      result[field as keyof T] = '[REDACTED]' as T[keyof T]
    }
  }

  return result
}
