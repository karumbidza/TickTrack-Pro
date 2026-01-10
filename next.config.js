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
  },

  // Headers for performance
  async headers() {
    return [
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
