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
    // External packages for server components (for AWS SDK used by R2)
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
      {
        // HSTS for HTTPS enforcement (only in production)
        source: '/:path*',
        headers: process.env.NODE_ENV === 'production' ? [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ] : [],
      },
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
