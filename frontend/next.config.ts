import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Disable the Image Optimization API entirely.
    // Mitigation for GHSA-3x4c-7xq6-9pq8 (unbounded next/image disk cache
    // growth) without requiring a Next.js 16 upgrade. Safe here because:
    //   - /starplex.png is a local static asset (no optimization needed)
    //   - The Giphy GIF is already marked `unoptimized` at the component level
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.giphy.com',
        // Restrict to /media/* paths only — prevents optimization requests
        // for arbitrary Giphy URLs if unoptimized is ever removed.
        pathname: '/media/**',
      },
    ],
  },
  output: 'standalone',
};

export default nextConfig;
