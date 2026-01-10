/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable compression (gzip/brotli) for responses
  compress: process.env.ENABLE_COMPRESSION === 'true',

  // Optimize production builds
  swcMinify: true,

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },

  // Headers for performance
  async headers() {
    const compressionEnabled = process.env.ENABLE_COMPRESSION === 'true'

    return [
      {
        // Apply to all API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
          ...(compressionEnabled
            ? [
                {
                  key: 'Content-Encoding',
                  value: 'gzip',
                },
              ]
            : []),
        ],
      },
    ]
  },
}

module.exports = nextConfig
