"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Ticket } from "lucide-react"

export function LandingNavbar() {
  return (
    <nav className="border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Ticket className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-xl">TickTrack Pro</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/pricing">
              <Button variant="ghost">Pricing</Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/get-started">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}