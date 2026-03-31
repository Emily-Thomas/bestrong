import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    // When API_BASE_URL is relative `/api`, forward to the Express backend so
    // requests are not handled by Next (which would return HTML).
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
