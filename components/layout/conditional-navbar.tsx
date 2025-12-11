"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"

export function ConditionalNavbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // Don't show navbar on landing page unless user is authenticated
  if (pathname === "/" && status !== "authenticated") {
    return null
  }

  // Don't show navbar on auth pages
  if (pathname.startsWith("/auth/")) {
    return null
  }

  // Don't show navbar on public pricing or about pages (unless authenticated)
  if ((pathname.startsWith("/pricing") || pathname.startsWith("/about")) && status !== "authenticated") {
    return null
  }

  // Show navbar for authenticated users or specific protected routes
  return <Navbar />
}