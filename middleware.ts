import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Add your public paths here
const publicPaths = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/api/auth',
  '/api/webhooks',
  '/pricing',
  '/about',
  '/contact'
]

// Add your super admin paths here
const superAdminPaths = [
  '/super-admin'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // Allow API routes and static files to pass through
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Check if it's a public path
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path))) {
    // If user is authenticated and trying to access auth pages, redirect them
    if (token && (pathname === '/auth/signin' || pathname === '/auth/signup')) {
      const role = token.role as string
      
      if (role === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/super-admin', request.url))
      } else if (['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(role)) {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (role === 'CONTRACTOR') {
        return NextResponse.redirect(new URL('/contractor', request.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/auth/signin', request.url)
    loginUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Handle contractor routes
  if (pathname.startsWith('/contractor')) {
    if (token.role !== 'CONTRACTOR') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    return NextResponse.next()
  }

  // Handle super admin routes
  if (superAdminPaths.some(path => pathname.startsWith(path))) {
    if (token.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    return NextResponse.next()
  }

  // Handle tenant-specific routing
  const url = request.nextUrl.clone()
  
  // Extract tenant from subdomain or path
  let tenantSlug: string | null = null
  
  // Method 1: Subdomain-based (e.g., company.ticktrack.com)
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    tenantSlug = subdomain
  }
  
  // Method 2: Path-based (e.g., /tenant/company/dashboard)
  const pathSegments = pathname.split('/')
  if (pathSegments[1] === 'tenant' && pathSegments[2]) {
    tenantSlug = pathSegments[2]
  }

  // If user has no tenant and trying to access tenant routes
  if (!token.tenantId && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/select-tenant', request.url))
  }

  // Add tenant context to headers for API routes and pages
  const response = NextResponse.next()
  
  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug)
  }
  
  if (token.tenantId) {
    response.headers.set('x-tenant-id', token.tenantId)
  }
  
  response.headers.set('x-user-role', token.role)
  response.headers.set('x-user-id', token.sub!)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}