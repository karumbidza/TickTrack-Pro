import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { MUIThemeProvider } from '@/components/providers/mui-theme-provider'
import { ConditionalNavbar } from '@/components/layout/conditional-navbar'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TickTrack Pro - Helpdesk Management System',
  description: 'Multi-tenant SaaS helpdesk and ticket tracking system for organizations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <MUIThemeProvider>
            <div className="min-h-screen bg-background">
              <ConditionalNavbar />
              <main>{children}</main>
              <Toaster />
            </div>
          </MUIThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}