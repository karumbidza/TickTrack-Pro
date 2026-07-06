import { useAuth } from '@clerk/clerk-expo'
import { useCallback } from 'react'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? ''

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/**
 * Authenticated API client for the TickTrack Pro Next.js routes. Attaches the
 * Clerk session token as a Bearer header — clerkMiddleware on the server accepts
 * it exactly like the web cookie session, so getAuthContext() resolves the same
 * user, role and tenant.
 */
export function useApi() {
  const { getToken } = useAuth()

  const request = useCallback(
    async <T = any>(path: string, init?: RequestInit): Promise<T> => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers ?? {}),
        },
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : null
      if (!res.ok) {
        throw new ApiError(res.status, data?.error || data?.message || `Request failed (${res.status})`)
      }
      return data as T
    },
    [getToken],
  )

  return {
    get: <T = any>(path: string) => request<T>(path),
    post: <T = any>(path: string, body?: any) =>
      request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
    patch: <T = any>(path: string, body?: any) =>
      request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  }
}
