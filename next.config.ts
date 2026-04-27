import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Image optimisation ────────────────────────────────────────────────────
  images: {
    // Add trusted external image domains here when connecting to Django backend
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "finstarindustrial.com",
      },
    ],
    // Modern formats for smaller payloads
    formats: ["image/avif", "image/webp"],
    // Sensible responsive breakpoints
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ── Compression ───────────────────────────────────────────────────────────
  compress: true,

  // ── Power-user: strict mode keeps React honest ────────────────────────────
  reactStrictMode: true,

  // ── Security & SEO headers ────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer policy for analytics accuracy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HSTS (uncomment on live HTTPS domain)
          // { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
      // Long cache for static assets
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
