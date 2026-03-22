import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { MUIThemeProvider } from '@/components/providers/mui-theme-provider'
import { AppLayout } from '@/components/layout/app-layout'
import { Toaster } from '@/components/ui/sonner'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-sans',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

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
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className={dmSans.className}>
        <AuthProvider>
          <MUIThemeProvider>
            <AppLayout>
              {children}
              <Toaster />
            </AppLayout>
          </MUIThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
