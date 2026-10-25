import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // The end-to-end runner (tests/run.mjs) builds into separate folders.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Common addresses payment providers and visitors try for the policy pages.
  async redirects() {
    return [
      // Non-www to www (Vercel already does this at the edge; this is a fallback with the same target).
      { source: '/:path*', has: [{ type: 'host', value: 'pdfadore.com' }], destination: 'https://www.pdfadore.com/:path*', statusCode: 301 },
      { source: '/shipping', destination: '/shipping-policy', permanent: true },
      { source: '/delivery-policy', destination: '/shipping-policy', permanent: true },
      { source: '/shipping-and-delivery', destination: '/shipping-policy', permanent: true },
      { source: '/refund', destination: '/refund-policy', permanent: true },
      { source: '/cancellation-policy', destination: '/refund-policy', permanent: true },
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/terms-and-conditions', destination: '/terms', permanent: true },
    ];
  },
};

export default nextConfig;
