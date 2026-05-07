import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  BusinessFactsJsonLd,
  LocalBusinessJsonLd,
  OrganizationJsonLd,
  SeoGraphJsonLd,
  SpeakableWebsiteJsonLd,
  WebsiteJsonLd,
} from "@/components/JsonLd";
import {
  buildPageMetadata,
  BUSINESS_COORDINATES,
  DEFAULT_EMAIL,
  DEFAULT_PHONE,
  SITE_URL,
} from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const rootMetadata = buildPageMetadata({
  title: "Industrial Refrigeration, HVAC, Cold Room & Boiler Solutions in Kenya",
  description:
    "Finstar Industrial Systems Ltd supplies industrial refrigeration equipment, HVAC systems, cold room products, industrial boilers, and engineering fittings in Nairobi, Kenya and across East Africa.",
  path: "/",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...rootMetadata,
  title: {
    default:
      "Industrial Refrigeration, HVAC, Cold Room & Boiler Solutions in Kenya",
    template: "%s | Finstar Industrial Systems Ltd",
  },
  applicationName: "Finstar Industrial Systems Ltd",
  authors: [{ name: "Finstar Industrial Systems Ltd", url: SITE_URL }],
  creator: "Finstar Industrial Systems Ltd",
  publisher: "Finstar Industrial Systems Ltd",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png" }],
    shortcut: ["/logo.png"],
  },
  other: {
    "geo.region": "KE-30",
    "geo.placename": "Nairobi",
    "geo.position": `${BUSINESS_COORDINATES.latitude};${BUSINESS_COORDINATES.longitude}`,
    ICBM: `${BUSINESS_COORDINATES.latitude}, ${BUSINESS_COORDINATES.longitude}`,
    "business:contact_data:locality": "Nairobi",
    "business:contact_data:country_name": "Kenya",
    "business:contact_data:email": DEFAULT_EMAIL,
    "business:contact_data:phone_number": DEFAULT_PHONE,
  },
};

import { ThemeProvider } from "@/components/ThemeProvider";
import SupportWidgetWrapper from "@/components/SupportWidgetWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-KE" className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Anti-FOUC: runs before any CSS is painted. Must stay inlined. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('finstar-theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;var el=document.documentElement;if(t==='dark'||(t===null&&d)){el.classList.add('dark');}else{el.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`min-h-screen flex flex-col antialiased ${inter.variable}`}>
        <ThemeProvider>
          <SeoGraphJsonLd>
            <OrganizationJsonLd />
            <LocalBusinessJsonLd />
            <WebsiteJsonLd />
            <SpeakableWebsiteJsonLd />
            <BusinessFactsJsonLd />
          </SeoGraphJsonLd>
          <Navbar />
          <main className="flex-1 pt-20 lg:pt-24">
            {children}
          </main>
          <Footer />
          <SupportWidgetWrapper />
        </ThemeProvider>
      </body>
    </html>
  );
}
