/**
 * Simple logger utility for production
 * In production, only errors are logged
 * In development, all logs are shown
 */

const isDev = process.env.NODE_ENV === 'development'
const isDebug = process.env.DEBUG === 'true'

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev || isDebug) {
      console.log('[DEBUG]', ...args)
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDev || isDebug) {
      console.log('[INFO]', ...args)
    }
  },
  
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args)
  },
  
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args)
  }
}

export default logger
