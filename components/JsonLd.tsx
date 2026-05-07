import type { ReactNode } from "react";
import type { Product } from "@/types";
import {
  absoluteUrl,
  BUSINESS_ADDRESS,
  BUSINESS_CITY,
  BUSINESS_COORDINATES,
  BUSINESS_COUNTRY,
  buildProductFaqs,
  DEFAULT_EMAIL,
  DEFAULT_PHONE,
  DEFAULT_PHONE_MACHINE,
  SERVICE_AREAS,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_URL,
  stripHtml,
  type BreadcrumbItem,
  type FaqItem,
} from "@/lib/seo";

type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

function JsonLd({ value }: { value: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(value) }}
    />
  );
}

export function SeoGraphJsonLd({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl("/logo.png"),
        image: absoluteUrl("/logo.png"),
        email: DEFAULT_EMAIL,
        telephone: DEFAULT_PHONE,
        description:
          "Finstar Industrial Systems Ltd supplies industrial refrigeration equipment, HVAC systems, cold room products, industrial boilers, and industrial fittings in Nairobi, Kenya, and East Africa.",
        sameAs: [
          "https://www.linkedin.com/company/finstar-industrial",
          "https://www.facebook.com/finstarindustrial",
        ],
        areaServed: SERVICE_AREAS.map((area) => ({ "@type": "Place", name: area })),
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: DEFAULT_PHONE_MACHINE,
            contactType: "sales",
            email: DEFAULT_EMAIL,
            areaServed: ["KE", "UG", "TZ", "RW", "CD", "BI"],
            availableLanguage: ["en"],
          },
        ],
      }}
    />
  );
}

export function LocalBusinessJsonLd() {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": ["LocalBusiness", "Store"],
        "@id": `${SITE_URL}/#localbusiness`,
        name: SITE_NAME,
        url: SITE_URL,
        image: absoluteUrl("/logo.png"),
        logo: absoluteUrl("/logo.png"),
        telephone: DEFAULT_PHONE,
        email: DEFAULT_EMAIL,
        priceRange: "$$",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Industrial Area, Enterprise Road",
          addressLocality: BUSINESS_CITY,
          addressRegion: BUSINESS_CITY,
          postalCode: "00100",
          addressCountry: "KE",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: BUSINESS_COORDINATES.latitude,
          longitude: BUSINESS_COORDINATES.longitude,
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "08:00",
            closes: "18:00",
          },
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: "Saturday",
            opens: "09:00",
            closes: "13:00",
          },
        ],
        areaServed: SERVICE_AREAS.map((area) => ({ "@type": "Place", name: area })),
        hasMap:
          "https://www.google.com/maps/place/Finstar+Industrial+Systems+Ltd/@-1.3050988,36.8390376,837m/data=!3m2!1e3!4b1!4m6!3m5!1s0x182f11c670b98d43:0x6f348874e48071b5!8m2!3d-1.3050988!4d36.8390376!16s%2Fg%2F11x8c2x1hk",
      }}
    />
  );
}

export function WebsiteJsonLd() {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_SHORT_NAME,
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.href),
        })),
      }}
    />
  );
}

export function FAQJsonLd({ faqs }: { faqs: FaqItem[] }) {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }}
    />
  );
}

export function ServicesJsonLd({
  services,
}: {
  services: { title: string; description: string }[];
}) {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@graph": services.map((service) => ({
          "@type": "Service",
          serviceType: service.title,
          name: service.title,
          description: service.description,
          provider: { "@id": `${SITE_URL}/#organization` },
          areaServed: SERVICE_AREAS.map((area) => ({ "@type": "Place", name: area })),
          availableChannel: {
            "@type": "ServiceChannel",
            serviceUrl: absoluteUrl("/contact"),
            servicePhone: DEFAULT_PHONE,
          },
        })),
      }}
    />
  );
}

export function ContactPageJsonLd() {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "@id": `${SITE_URL}/contact#webpage`,
        url: absoluteUrl("/contact"),
        name: `Contact ${SITE_NAME}`,
        description:
          "Contact Finstar Industrial Systems Ltd in Nairobi for industrial refrigeration, HVAC, boiler, cold room, and engineering quotation requests.",
        about: { "@id": `${SITE_URL}/#organization` },
        primaryImageOfPage: absoluteUrl("/opengraph-image"),
      }}
    />
  );
}

export function ReviewAggregateJsonLd({
  ratingValue,
  reviewCount,
}: {
  ratingValue: number;
  reviewCount: number;
}) {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${SITE_URL}/#localbusiness`,
        name: SITE_NAME,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue,
          reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      }}
    />
  );
}

export function ProductJsonLd({ product }: { product: Product }) {
  const description = stripHtml(product.description || product.shortDescription);
  const faqs = buildProductFaqs(product);

  return (
    <>
      <JsonLd
        value={{
          "@context": "https://schema.org",
          "@type": "Product",
          "@id": `${absoluteUrl(`/products/${product.slug}`)}#product`,
          name: product.name,
          description,
          category: product.category.name,
          url: absoluteUrl(`/products/${product.slug}`),
          image: product.imageUrls.length > 0 ? product.imageUrls : product.imageUrl ? [product.imageUrl] : undefined,
          brand: {
            "@type": "Brand",
            name: SITE_SHORT_NAME,
          },
          manufacturer: {
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: SITE_NAME,
          },
          additionalProperty: product.specs
            ? Object.entries(product.specs).map(([name, value]) => ({
                "@type": "PropertyValue",
                name,
                value,
              }))
            : undefined,
          offers: {
            "@type": "Offer",
            url: absoluteUrl(`/products/${product.slug}`),
            availability: "https://schema.org/InStock",
            priceCurrency: "KES",
            seller: { "@id": `${SITE_URL}/#organization` },
            priceSpecification: {
              "@type": "PriceSpecification",
              priceCurrency: "KES",
              price: "0",
            },
          },
          areaServed: SERVICE_AREAS,
        }}
      />
      <FAQJsonLd faqs={faqs} />
    </>
  );
}

export function CollectionPageJsonLd({
  name,
  description,
  path,
  products,
}: {
  name: string;
  description: string;
  path: string;
  products: Product[];
}) {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${absoluteUrl(path)}#collection`,
        name,
        description,
        url: absoluteUrl(path),
        mainEntity: {
          "@type": "ItemList",
          itemListElement: products.map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(`/products/${product.slug}`),
            name: product.name,
          })),
        },
      }}
    />
  );
}

export function SpeakableWebsiteJsonLd() {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: SITE_SHORT_NAME,
        url: SITE_URL,
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["h1", ".seo-summary", ".faq-answer"],
        },
      }}
    />
  );
}

export function BusinessFactsJsonLd() {
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "Place",
        name: SITE_NAME,
        address: {
          "@type": "PostalAddress",
          streetAddress: BUSINESS_ADDRESS,
          addressLocality: BUSINESS_CITY,
          addressCountry: BUSINESS_COUNTRY,
        },
      }}
    />
  );
}
