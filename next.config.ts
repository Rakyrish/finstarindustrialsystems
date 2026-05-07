import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Standalone output for Docker ──────────────────────────────────────────
  output: "standalone",
  poweredByHeader: false,

  // ── Allow dev network access ──────────────────────────────────────────────
  allowedDevOrigins: ["192.168.2.113", "192.168.0.178"],

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
      {
        protocol: "https",
        hostname: "finstarindustrials.com",
      },
      {
        protocol: "https",
        hostname: "i0.wp.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
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
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
      {
        source: "/(sitemap.xml|image-sitemap.xml|robots.txt|manifest.webmanifest)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
