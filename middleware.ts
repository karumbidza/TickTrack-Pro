import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing',
  '/about',
  '/contact',
  '/api/webhooks/clerk(.*)',
  '/api/health(.*)',
])

const isSuperAdminRoute = createRouteMatcher(['/super-admin(.*)'])
const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isContractorRoute = createRouteMatcher(['/contractor(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return

  const { userId, sessionClaims } = await auth()

  if (!userId) {
    return (await auth()).redirectToSignIn()
  }

  const meta = ((sessionClaims?.metadata ?? sessionClaims?.publicMetadata ?? {}) as Record<string, string | undefined>)
  const role = meta.role

  if (isSuperAdminRoute(req)) {
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  if (isContractorRoute(req)) {
    if (role !== 'CONTRACTOR') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Generate request ID for correlation
  const response = NextResponse.next()
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    response.headers.set('x-request-id', crypto.randomUUID())
  }
  if (role) response.headers.set('x-user-role', role)

  return response
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/(api|trpc)(.*)',
  ],
}
