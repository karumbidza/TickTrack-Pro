"use client"

import { useUser } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"

export function ConditionalNavbar() {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()

  const isAuthenticated = isLoaded && !!user

  // Don't show navbar on landing page unless user is authenticated
  if (pathname === "/" && !isAuthenticated) {
    return null
  }

  // Don't show navbar on auth pages (Clerk sign-in/sign-up)
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return null
  }

  // Don't show navbar on public pricing or about pages (unless authenticated)
  if ((pathname.startsWith("/pricing") || pathname.startsWith("/about")) && !isAuthenticated) {
    return null
  }

  // Show navbar for authenticated users or specific protected routes
  return <Navbar />
}