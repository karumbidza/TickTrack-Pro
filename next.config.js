// Content-Security-Policy. Kept pragmatic so it does not break Next's inline
// bootstrap, MUI/Emotion inline styles, Clerk, Paynow redirects, or R2 images —
// while still enforcing frame-ancestors (clickjacking), base-uri, object-src and
// form-action. Tighten script-src to nonces once the app is verified in staging.
// NOTE: validate Clerk auth + Paynow redirect flows in staging before relying on this.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://*.clerk.com https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.paynow.co.zw https://*.paynow.co.zw",
  "object-src 'none'",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable compression (gzip/brotli) for responses
  // Note: Next.js handles compression automatically when compress: true
  compress: true,

  // Optimize production builds
  swcMinify: true,

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
    // External packages that should not be bundled by server components.
    // (Next 14 uses experimental.serverComponentsExternalPackages; the
    // top-level serverExternalPackages key is Next 15+ and was silently ignored.)
    serverComponentsExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/lib-storage'],
  },

  // Security and Performance Headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: CONTENT_SECURITY_POLICY,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      ...(process.env.NODE_ENV === 'production' ? [{
        // HSTS for HTTPS enforcement (only in production)
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      }] : []),
      {
        // Apply to all API routes - disable caching for dynamic data
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
