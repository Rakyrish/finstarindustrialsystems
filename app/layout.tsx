import type { Metadata, Viewport } from "next";
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
import { ThemeProvider } from "@/components/ThemeProvider";
import SupportWidgetWrapper from "@/components/SupportWidgetWrapper";
import { ImageProtectionProvider } from "@/components/ImageProtectionProvider";
import { fetchAllProducts, getPublicImageProtectionSettings } from "@/lib/api";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ea580c",
};

// Site-wide aggregate rating for LocalBusinessJsonLd — same /api/reviews route
// the homepage's visible ReviewsSection uses, ISR-cached 24h server-side.
async function getAggregateRating(): Promise<{ ratingValue: number; reviewCount: number } | undefined> {
  try {
    const res = await fetch(`${SITE_URL}/api/reviews`, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error("Reviews fetch failed");
    const data: { overallRating: number; totalRatings: number } = await res.json();
    return data.totalRatings > 0 ? { ratingValue: data.overallRating, reviewCount: data.totalRatings } : undefined;
  } catch {
    return undefined;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch products for global search — gracefully handle API unavailability
  const products = await fetchAllProducts().catch(() => []);
  const imageProtectionSettings = await getPublicImageProtectionSettings().catch(() => null);
  const aggregateRating = await getAggregateRating();

  return (
    <html lang="en-KE" className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Anti-FOUC: runs before any CSS is painted */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('finstar-theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;var el=document.documentElement;if(t==='dark'||(t===null&&d)){el.classList.add('dark');}else{el.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`min-h-screen flex flex-col antialiased ${inter.variable}`} suppressHydrationWarning>
        <ThemeProvider>
          <ImageProtectionProvider settings={imageProtectionSettings}>
            <SeoGraphJsonLd>
              <OrganizationJsonLd />
              <LocalBusinessJsonLd aggregateRating={aggregateRating} />
              <WebsiteJsonLd />
              <SpeakableWebsiteJsonLd />
              <BusinessFactsJsonLd />
            </SeoGraphJsonLd>
            <Navbar products={products} />
            <main className="flex-1 pt-20 lg:pt-24">
              {children}
            </main>
            <Footer />
            <SupportWidgetWrapper />
          </ImageProtectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
