"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/Logo"

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
        <Logo size="sm" href="/" />

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
