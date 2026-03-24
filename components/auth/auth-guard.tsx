'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const role = meta.role ?? 'END_USER'

  useEffect(() => {
    if (!isLoaded) return

    if (!user) {
      router.push('/sign-in')
      return
    }

    // Check role access if allowedRoles is specified
    if (allowedRoles && !allowedRoles.includes(role)) {
      router.push('/dashboard')
    }
  }, [isLoaded, user, router, allowedRoles, role])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface2">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}