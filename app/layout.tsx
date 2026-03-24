import type { Metadata } from 'next'
import { DM_Sans, DM_Mono, Manrope } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
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

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-headline',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TickTrack Pro',
  description: 'Maintenance management for multi-branch organisations',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${dmSans.variable} ${dmMono.variable} ${manrope.variable}`}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
        </head>
        <body className={dmSans.className}>
          <MUIThemeProvider>
            <AppLayout>
              {children}
              <Toaster />
            </AppLayout>
          </MUIThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
