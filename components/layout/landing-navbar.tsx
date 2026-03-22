"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Ticket } from "lucide-react"

export function LandingNavbar() {
  return (
    <nav
      style={{
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 64,
      }}
      className="flex items-center"
    >
      <div className="mx-auto w-full max-w-[1100px] px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Ticket className="h-5 w-5" style={{ color: 'var(--text-primary)' }} />
          <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 16 }}>TickTrack Pro</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/pricing">
            <Button variant="ghost" size="sm">Pricing</Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="outline" size="sm">Login</Button>
          </Link>
          <Link href="/get-started">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
