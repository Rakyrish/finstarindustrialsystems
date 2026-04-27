import { Product } from "@/types";

const BASE_URL = "https://finstarindustrial.com";

/** Product JSON-LD Schema (schema.org/Product) */
export function ProductJsonLd({ product }: { product: Product }) {
  const categoryLabels: Record<string, string> = {
    refrigeration: "Refrigeration Systems",
    hvac: "Air Conditioning & HVAC",
    boilers: "Boilers & Steam Systems",
    "cold-rooms": "Cold Rooms & Insulation",
    fittings: "Industrial Fittings & Tools",
  };

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    url: `${BASE_URL}/products/${product.id}`,
    brand: {
      "@type": "Brand",
      name: "Finstar Industrial Systems",
    },
    manufacturer: {
      "@type": "Organization",
      name: "Finstar Industrial Systems",
      url: BASE_URL,
    },
    category: categoryLabels[product.category] ?? product.category,
    offers: {
      "@type": "Offer",
      priceCurrency: "KES",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Finstar Industrial Systems",
      },
    },
    ...(product.specs && {
      additionalProperty: Object.entries(product.specs).map(([name, value]) => ({
        "@type": "PropertyValue",
        name,
        value,
      })),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}

/** Organization JSON-LD Schema (used on Home / About) */
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Finstar Industrial Systems",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      "Kenya's leading supplier and installer of industrial refrigeration systems, HVAC, boilers, cold rooms, and industrial fittings.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Enterprise Road, Industrial Area",
      addressLocality: "Nairobi",
      addressCountry: "KE",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+254-700-123-456",
        contactType: "sales",
        areaServed: ["KE", "UG", "TZ"],
        availableLanguage: "English",
      },
      {
        "@type": "ContactPoint",
        telephone: "+254-700-999-000",
        contactType: "customer support",
        areaServed: ["KE", "UG", "TZ"],
        availableLanguage: "English",
      },
    ],
    sameAs: [
      "https://www.linkedin.com/company/finstar-industrial",
      "https://www.facebook.com/finstarindustrial",
    ],
    foundingDate: "2005",
    numberOfEmployees: { "@type": "QuantitativeValue", value: 150 },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}

/** BreadcrumbList JSON-LD */
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; href: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: `${BASE_URL}${item.href}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}

/** WebSite / SiteLinksSearchBox JSON-LD */
export function WebsiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Finstar Industrial Systems",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}
