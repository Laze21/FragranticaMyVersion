import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // PGlite ships WASM + data files that must be loaded with native require at runtime.
  serverExternalPackages: ['@electric-sql/pglite'],
  // Local demo mode reads migrations and seed SQL from disk at runtime.
  outputFileTracingIncludes: {
    '/**': ['./supabase/migrations/*.sql', './supabase/seed.sql', './supabase/local/*.sql'],
    '/fragrance/*/opengraph-image*': ['./src/fonts/og/*.ttf', './public/bottles/*.webp'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 828, 1080, 1440, 1920],
    imageSizes: [48, 96, 160, 240, 320],
    qualities: [70, 82],
  },
  experimental: {
    optimizePackageImports: ['three'],
  },
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/bottles/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

export default nextConfig;
