import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const BASE_URL = "https://finstarindustrial.com";

export const metadata: Metadata = {
  // ── Base URL (required for all absolute og/sitemap URLs) ──────────────────
  metadataBase: new URL(BASE_URL),

  // ── Titles ────────────────────────────────────────────────────────────────
  title: {
    default:
      "Finstar Industrial Systems | Refrigeration, HVAC & Boiler Solutions Kenya",
    template: "%s | Finstar Industrial Systems",
  },

  // ── Description ───────────────────────────────────────────────────────────
  description:
    "Kenya's leading supplier & installer of industrial refrigeration systems, air conditioning (HVAC), steam boilers, cold rooms, insulation panels and industrial fittings. Trusted by 500+ businesses across East Africa since 2005.",

  // ── Keywords ──────────────────────────────────────────────────────────────
  keywords: [
    "industrial refrigeration Kenya",
    "HVAC systems Nairobi",
    "cold room installation Kenya",
    "industrial boilers Kenya",
    "steam systems East Africa",
    "commercial refrigeration units",
    "ducted air conditioning Kenya",
    "VRF system installation",
    "walk-in freezer Kenya",
    "cold room panels",
    "PIR insulation panels",
    "industrial fittings Kenya",
    "refrigeration engineer Nairobi",
    "HVAC contractor Kenya",
    "boiler installation Nairobi",
    "Finstar Industrial Systems",
  ],

  // ── Authors / Publisher ───────────────────────────────────────────────────
  authors: [{ name: "Finstar Industrial Systems", url: BASE_URL }],
  creator: "Finstar Industrial Systems",
  publisher: "Finstar Industrial Systems",

  // ── Canonical ─────────────────────────────────────────────────────────────
  alternates: {
    canonical: "/",
  },

  // ── Open Graph ────────────────────────────────────────────────────────────
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Finstar Industrial Systems",
    title:
      "Finstar Industrial Systems | Refrigeration, HVAC & Boiler Solutions Kenya",
    description:
      "Kenya's leading supplier & installer of industrial refrigeration, HVAC, boilers, cold rooms & industrial fittings. 500+ clients. 20+ years experience.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Finstar Industrial Systems – Refrigeration, HVAC & Boiler Solutions",
      },
    ],
  },

  // ── Twitter Card ──────────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title:
      "Finstar Industrial Systems | Refrigeration, HVAC & Boiler Solutions Kenya",
    description:
      "Kenya's leading supplier & installer of industrial refrigeration, HVAC, boilers, cold rooms & industrial fittings.",
    images: ["/og-image.png"],
  },

  // ── Robots / Indexing ─────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Verification (add your tokens when available) ─────────────────────────
  verification: {
    // google: "your-google-site-verification-token",
    // yandex: "your-yandex-token",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20 lg:pt-24">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
