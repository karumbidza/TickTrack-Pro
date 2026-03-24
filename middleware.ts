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


export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return

  const { userId, sessionClaims } = await auth()

  if (!userId) {
    return (await auth()).redirectToSignIn()
  }

  // Role-based route protection is handled at the page level via useUser()
  // Middleware only enforces authentication (userId check above)
  const response = NextResponse.next()
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    response.headers.set('x-request-id', crypto.randomUUID())
  }

  return response
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/(api|trpc)(.*)',
  ],
}
