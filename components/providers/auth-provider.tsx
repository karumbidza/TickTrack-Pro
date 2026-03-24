'use client'

// Clerk is provided at the root layout via ClerkProvider.
// This file is kept as a no-op wrapper for backwards compatibility.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
