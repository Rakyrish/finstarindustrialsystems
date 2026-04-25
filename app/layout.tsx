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

export const metadata: Metadata = {
  title: {
    default: "Finstar Industrial Systems | Refrigeration, HVAC & Boiler Solutions",
    template: "%s | Finstar Industrial Systems",
  },
  description:
    "Finstar Industrial Systems supplies and installs refrigeration systems, air conditioning (HVAC), boilers, cold rooms, insulation materials, and industrial fittings across East Africa.",
  keywords: [
    "industrial refrigeration",
    "HVAC",
    "cold rooms",
    "boilers",
    "steam systems",
    "industrial fittings",
    "Kenya",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://finstarindustrial.com",
    siteName: "Finstar Industrial Systems",
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
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
