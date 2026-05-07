import type { Metadata } from "next";
import type { Category, Product } from "@/types";

export const SITE_URL = "https://finstarindustrials.com";
export const SITE_NAME = "Finstar Industrial Systems Ltd";
export const SITE_SHORT_NAME = "Finstar Industrial Systems";
export const DEFAULT_OG_IMAGE = "/opengraph-image";
export const DEFAULT_TWITTER_IMAGE = "/twitter-image";
export const DEFAULT_PHONE = "+254 726 559 606";
export const DEFAULT_PHONE_MACHINE = "+254726559606";
export const DEFAULT_EMAIL = "info@finstarindustrial.com";
export const BUSINESS_ADDRESS = "Industrial Area, Enterprise Road, Nairobi, Kenya";
export const BUSINESS_CITY = "Nairobi";
export const BUSINESS_COUNTRY = "Kenya";
export const BUSINESS_COORDINATES = {
  latitude: -1.3050988,
  longitude: 36.8390376,
};

export const SERVICE_AREAS = [
  "Nairobi",
  "Kenya",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "DRC Congo",
  "Burundi",
  "East Africa",
  "Central Africa",
] as const;

export const DEFAULT_KEYWORDS = [
  "industrial refrigeration Kenya",
  "cold room installation Kenya",
  "HVAC systems Kenya",
  "industrial boilers Kenya",
  "refrigeration equipment suppliers Kenya",
  "cold storage solutions East Africa",
  "industrial cooling systems Nairobi",
  "industrial fittings Kenya",
  "steam boiler installation Kenya",
  "commercial refrigeration Kenya",
  "refrigeration contractors Nairobi",
  "HVAC contractors Kenya",
  "industrial engineering Kenya",
  "cold room contractors Nairobi",
  "boiler maintenance Kenya",
  "industrial equipment supplier Nairobi",
  "Finstar Industrial Systems Ltd",
];

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

interface BuildPageMetadataOptions {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}

interface CategorySeoContent {
  headline: string;
  description: string;
  introTitle: string;
  paragraphs: string[];
  faqs: FaqItem[];
  keywords: string[];
}

const CATEGORY_SEO_MAP: Record<string, CategorySeoContent> = {
  refrigeration: {
    headline: "Industrial Refrigeration Equipment in Kenya",
    description:
      "Explore industrial refrigeration systems, condensing units, compressors, evaporators, refrigerants, and cooling accessories supplied across Kenya and East Africa.",
    introTitle: "Industrial refrigeration solutions for food, pharma, hospitality, and manufacturing",
    paragraphs: [
      "Finstar Industrial Systems Ltd supplies industrial refrigeration equipment in Kenya for cold rooms, processing plants, supermarkets, laboratories, distribution hubs, and commercial buildings. Our refrigeration product range supports stable temperature control, energy efficiency, and long operating life in demanding environments across Nairobi, Kenya, Uganda, Tanzania, Rwanda, DRC Congo, and Burundi.",
      "Whether you need industrial cooling systems in Nairobi, a cold storage upgrade, or reliable refrigeration equipment suppliers in Kenya, this category brings together proven components and engineered equipment designed for East African operating conditions. Each product listing supports faster comparison, clearer specification review, and easier quotation requests for procurement teams and engineers.",
    ],
    faqs: [
      {
        question: "Where can I buy industrial refrigeration equipment in Kenya?",
        answer:
          "You can buy industrial refrigeration equipment in Kenya from Finstar Industrial Systems Ltd in Nairobi. We supply refrigeration systems, cold room components, and industrial cooling accessories for projects across Kenya and East Africa.",
      },
      {
        question: "Do you deliver refrigeration equipment outside Nairobi?",
        answer:
          "Yes. Finstar Industrial Systems Ltd supports deliveries and project supply across Nairobi, the rest of Kenya, and regional markets including Uganda, Tanzania, Rwanda, DRC Congo, and Burundi.",
      },
      {
        question: "Can Finstar help with cold room and refrigeration system selection?",
        answer:
          "Yes. Our team can guide you on refrigeration equipment sizing, application fit, installation planning, and quotation support for industrial and commercial projects.",
      },
    ],
    keywords: [
      "industrial refrigeration Kenya",
      "commercial refrigeration Kenya",
      "industrial cooling systems Nairobi",
      "refrigeration contractors Nairobi",
    ],
  },
  hvac: {
    headline: "HVAC Systems and Air Conditioning Equipment in Kenya",
    description:
      "Browse HVAC systems, air conditioning equipment, ventilation products, and climate control solutions for industrial and commercial projects in Kenya and East Africa.",
    introTitle: "HVAC systems for factories, offices, healthcare, retail, and hospitality",
    paragraphs: [
      "Finstar Industrial Systems Ltd supplies HVAC systems in Kenya for industrial buildings, institutions, offices, hospitality sites, healthcare facilities, and temperature-sensitive environments. Our catalog covers split systems, ventilation products, ducted solutions, and commercial HVAC equipment suited to high-demand East African applications.",
      "If you are searching for HVAC contractors in Kenya or climate control systems in Nairobi, this category is structured to help procurement and engineering teams find relevant products quickly. Every listing supports better comparison between equipment options, applications, and available technical details before requesting a quotation.",
    ],
    faqs: [
      {
        question: "Do you supply HVAC systems for commercial and industrial sites in Kenya?",
        answer:
          "Yes. Finstar Industrial Systems Ltd supplies HVAC systems for commercial buildings, industrial facilities, hospitality projects, and institutional sites across Kenya and East Africa.",
      },
      {
        question: "Are your HVAC products available for projects outside Nairobi?",
        answer:
          "Yes. We serve Nairobi and regional markets across Kenya, Uganda, Tanzania, Rwanda, DRC Congo, and Burundi depending on project requirements.",
      },
      {
        question: "Can you help match HVAC equipment to the application?",
        answer:
          "Yes. Our team can help review building type, cooling load, airflow requirements, and operating needs before recommending suitable HVAC products.",
      },
    ],
    keywords: [
      "HVAC systems Kenya",
      "HVAC contractors Kenya",
      "commercial air conditioning Kenya",
      "industrial ventilation Nairobi",
    ],
  },
  boilers: {
    headline: "Industrial Boilers and Steam Systems in Kenya",
    description:
      "Find industrial boilers, steam system components, burners, and boiler accessories supplied for manufacturing, hospitality, institutions, and process plants in Kenya.",
    introTitle: "Boiler and steam system equipment for process heat and plant reliability",
    paragraphs: [
      "Finstar Industrial Systems Ltd supplies industrial boilers in Kenya for manufacturing plants, food processing, hospitality, institutions, healthcare, and other operations that depend on reliable steam and process heat. Our range includes boiler systems, steam accessories, combustion components, and support products designed for performance and maintainability.",
      "This category is built for engineers, plant managers, and procurement teams researching industrial boilers Kenya, steam boiler installation Kenya, and burner system upgrades in Nairobi. It strengthens product discovery for regional buyers across Kenya, Uganda, Tanzania, Rwanda, DRC Congo, and Burundi.",
    ],
    faqs: [
      {
        question: "Where can I source industrial boilers in Kenya?",
        answer:
          "Finstar Industrial Systems Ltd in Nairobi supplies industrial boilers and steam system equipment for projects across Kenya and East Africa.",
      },
      {
        question: "Do you support steam boiler projects outside Nairobi?",
        answer:
          "Yes. We work with clients across Kenya and East Africa, including Uganda, Tanzania, Rwanda, DRC Congo, and Burundi depending on the project scope.",
      },
      {
        question: "Can you advise on boiler accessories and system components?",
        answer:
          "Yes. We help clients identify suitable burners, valves, controls, and related steam system components for industrial operating requirements.",
      },
    ],
    keywords: [
      "industrial boilers Kenya",
      "steam boiler installation Kenya",
      "boiler suppliers Nairobi",
      "steam systems East Africa",
    ],
  },
  "cold-rooms": {
    headline: "Cold Room Equipment and Cold Storage Solutions in Kenya",
    description:
      "Shop cold room components, cold storage equipment, insulation panels, and refrigeration products for commercial and industrial temperature-controlled spaces in Kenya.",
    introTitle: "Cold room and cold storage products for reliable temperature-controlled operations",
    paragraphs: [
      "Finstar Industrial Systems Ltd supports cold room installation Kenya and cold storage solutions East Africa through a focused range of temperature-control products, panel systems, refrigeration accessories, and supporting components. These products are used in hospitality, food processing, pharmaceuticals, floriculture, agriculture, retail, and logistics operations.",
      "For buyers looking for cold room contractors in Nairobi or dependable cold storage equipment across Kenya, this category brings together a curated selection of reliable products to help engineering teams compare options and request tailored quotations efficiently.",
    ],
    faqs: [
      {
        question: "Do you supply products for cold room installation in Kenya?",
        answer:
          "Yes. Finstar Industrial Systems Ltd supplies cold room products, refrigeration components, and insulation-related equipment for projects across Kenya and East Africa.",
      },
      {
        question: "Can you support cold storage projects outside Nairobi?",
        answer:
          "Yes. We supply cold storage products for projects in Nairobi, across Kenya, and in key East and Central African markets.",
      },
      {
        question: "What industries use your cold room equipment?",
        answer:
          "Our cold room products support food storage, hospitality, pharmaceuticals, retail, agriculture, floriculture, and logistics operations.",
      },
    ],
    keywords: [
      "cold room installation Kenya",
      "cold storage solutions East Africa",
      "cold room contractors Nairobi",
      "commercial refrigeration Kenya",
    ],
  },
  fittings: {
    headline: "Industrial Fittings and Engineering Accessories in Kenya",
    description:
      "Browse industrial fittings, valves, accessories, and engineering support products supplied for refrigeration, HVAC, steam, fluid, and plant systems across Kenya.",
    introTitle: "Industrial fittings and support accessories for refrigeration, HVAC, steam, and utility systems",
    paragraphs: [
      "Finstar Industrial Systems Ltd supplies industrial fittings in Kenya for refrigeration lines, HVAC systems, steam installations, maintenance work, and industrial engineering projects. This category supports contractors, plant operators, installers, and procurement teams searching for dependable accessories that keep systems safe, compliant, and efficient.",
      "This category is built for engineers, plant operators, installers, and procurement teams searching for dependable accessories that keep industrial systems safe, efficient, and well-maintained across Kenya and East Africa.",
    ],
    faqs: [
      {
        question: "Where can I buy industrial fittings in Kenya?",
        answer:
          "Finstar Industrial Systems Ltd supplies industrial fittings in Nairobi and supports buyers across Kenya and East Africa for engineering and maintenance projects.",
      },
      {
        question: "Do your fittings support refrigeration and HVAC systems?",
        answer:
          "Yes. The category includes fittings and accessories relevant to refrigeration, HVAC, steam, and related industrial utility systems.",
      },
      {
        question: "Can you deliver industrial fittings outside Nairobi?",
        answer:
          "Yes. We support supply requests across Kenya and regional East African markets subject to product availability and project scope.",
      },
    ],
    keywords: [
      "industrial fittings Kenya",
      "engineering fittings Nairobi",
      "industrial accessories Kenya",
      "plant maintenance supplies Kenya",
    ],
  },
};

export const homepageFaqs: FaqItem[] = [
  {
    question: "What does Finstar Industrial Systems Ltd do in Kenya?",
    answer:
      "Finstar Industrial Systems Ltd supplies industrial refrigeration equipment, HVAC systems, boiler equipment, cold room products, and engineering accessories for businesses across Nairobi, Kenya, and East Africa.",
  },
  {
    question: "Which regions does Finstar Industrial Systems Ltd serve?",
    answer:
      "We serve Nairobi and the wider Kenyan market while supporting projects and supply requirements in Uganda, Tanzania, Rwanda, DRC Congo, Burundi, and other East and Central African territories.",
  },
  {
    question: "Can I request a quote for industrial refrigeration or HVAC equipment?",
    answer:
      "Yes. You can request a quote through the contact page, by phone, or by WhatsApp for refrigeration, cold room, HVAC, boiler, and industrial engineering requirements.",
  },
  {
    question: "What makes Finstar the right supplier for industrial equipment in East Africa?",
    answer:
      "Finstar Industrial Systems Ltd combines deep local market knowledge, a broad product range, and direct relationships with leading global manufacturers. Our Nairobi-based team supports engineers, procurement managers, and facility operators from initial enquiry through to delivery and after-sales support.",
  },
];

export const catalogueFaqs: FaqItem[] = [
  {
    question: "Where can I find industrial refrigeration, HVAC, and boiler products in Kenya?",
    answer:
      "The Finstar product catalogue groups industrial refrigeration, HVAC, boiler, cold room, and fitting products into dedicated categories so engineers and buyers in Kenya can find equipment faster.",
  },
  {
    question: "Do you supply products across East Africa?",
    answer:
      "Yes. Finstar Industrial Systems Ltd supports supply requests across Kenya and key East African markets including Uganda, Tanzania, Rwanda, DRC Congo, and Burundi.",
  },
  {
    question: "How do I request pricing for a listed product?",
    answer:
      "Open the product page and use the quote or inquiry action, or contact Finstar Industrial Systems Ltd directly by phone, WhatsApp, or email for pricing and availability.",
  },
];

export const contactFaqs: FaqItem[] = [
  {
    question: "Where is Finstar Industrial Systems Ltd located in Kenya?",
    answer:
      "Finstar Industrial Systems Ltd is located in Nairobi, Kenya, serving clients in Industrial Area and supporting supply and engineering projects across East Africa.",
  },
  {
    question: "Can I request a quote for cold room installation or HVAC systems in Kenya?",
    answer:
      "Yes. Use the contact form, phone number, or WhatsApp link to request quotations for cold room products, HVAC systems, refrigeration equipment, boilers, and industrial fittings.",
  },
  {
    question: "Does Finstar Industrial Systems Ltd handle projects outside Nairobi?",
    answer:
      "Yes. The company supports clients throughout Kenya and regional markets including Uganda, Tanzania, Rwanda, DRC Congo, and Burundi depending on product and project scope.",
  },
];

export function absoluteUrl(path = "") {
  if (!path) {
    return SITE_URL;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueKeywords(keywords: string[] = []) {
  return Array.from(new Set([...DEFAULT_KEYWORDS, ...keywords]));
}

export function buildPageMetadata({
  title,
  description,
  path,
  keywords = [],
  image,
  type = "website",
  noIndex = false,
}: BuildPageMetadataOptions): Metadata {
  return {
    title,
    description,
    keywords: uniqueKeywords(keywords),
    category: "industrial engineering",
    alternates: {
      canonical: path,
      languages: {
        "en-KE": path,
        en: path,
        "x-default": path,
      },
    },
    openGraph: {
      type,
      url: absoluteUrl(path),
      siteName: SITE_SHORT_NAME,
      title,
      description,
      locale: "en_KE",
      images: [
        {
          url: absoluteUrl(image ?? DEFAULT_OG_IMAGE),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(image ?? DEFAULT_TWITTER_IMAGE)],
    },
    robots: noIndex
      ? {
          index: false,
          follow: true,
          googleBot: {
            index: false,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : undefined,
  };
}

export function buildProductMetadata(product: Product): Metadata {
  const descriptionSource = product.shortDescription || stripHtml(product.description);
  const description = `${descriptionSource.slice(0, 150)} ${descriptionSource.length > 150 ? "..." : ""}`.trim();

  return buildPageMetadata({
    title: `${product.name} | ${product.category.name} Supplier in Kenya`,
    description,
    path: `/products/${product.slug}`,
    keywords: [
      product.name,
      product.category.name,
      `${product.category.name} Kenya`,
      "industrial equipment Kenya",
      "Nairobi industrial supplier",
    ],
    image: product.imageUrl || product.imageUrls[0],
    type: "article",
  });
}

export function getCategorySeoContent(category: Pick<Category, "slug" | "name" | "description">) {
  const mapped = CATEGORY_SEO_MAP[category.slug];
  if (mapped) {
    return mapped;
  }

  return {
    headline: `${category.name} Products in Kenya`,
    description:
      category.description ||
      `${category.name} products supplied by ${SITE_NAME} for industrial and commercial projects in Nairobi, Kenya, and East Africa.`,
    introTitle: `${category.name} supply solutions for Kenya and East Africa`,
    paragraphs: [
      `${SITE_NAME} supplies ${category.name.toLowerCase()} products for buyers in Nairobi, Kenya, and the wider East African market. This landing page is built to help procurement teams, engineers, and facility operators find relevant products faster and request quotations more easily.`,
      `Use this category page to browse available ${category.name.toLowerCase()} products, compare applications, and connect with ${SITE_NAME} for supply support across Kenya, Uganda, Tanzania, Rwanda, DRC Congo, and Burundi.`,
    ],
    faqs: [
      {
        question: `Where can I buy ${category.name.toLowerCase()} products in Kenya?`,
        answer: `${SITE_NAME} in Nairobi supplies ${category.name.toLowerCase()} products for industrial and commercial clients across Kenya and East Africa.`,
      },
      {
        question: `Does Finstar deliver ${category.name.toLowerCase()} products outside Nairobi?`,
        answer: `Yes. ${SITE_NAME} supports deliveries and project supply across Nairobi, Kenya, and regional markets in East and Central Africa.`,
      },
      {
        question: `How do I request a quote for ${category.name.toLowerCase()} products?`,
        answer: `Browse the category, open the relevant product page, and contact ${SITE_NAME} by phone, email, WhatsApp, or the quote form for pricing and availability.`,
      },
    ],
    keywords: [
      `${category.name} Kenya`,
      `${category.name} Nairobi`,
      `${category.name} East Africa`,
    ],
  };
}

export function buildCategoryPath(slug: string) {
  return `/products/category/${slug}`;
}

export function buildCategoryMetadata(category: Pick<Category, "slug" | "name" | "description">): Metadata {
  const seo = getCategorySeoContent(category);

  return buildPageMetadata({
    title: seo.headline,
    description: seo.description,
    path: buildCategoryPath(category.slug),
    keywords: seo.keywords,
  });
}

export function buildProductFaqs(product: Product): FaqItem[] {
  return [
    {
      question: `Where can I buy ${product.name} in Kenya?`,
      answer: `${SITE_NAME} in Nairobi supplies ${product.name} for industrial and commercial buyers across Kenya. Contact our team for pricing, availability, and project guidance.`,
    },
    {
      question: `Does Finstar deliver ${product.name} across East Africa?`,
      answer: `${SITE_NAME} supports supply requirements for ${product.name} across Kenya, Uganda, Tanzania, Rwanda, DRC Congo, and Burundi depending on product availability and project scope.`,
    },
    {
      question: `Can I request technical guidance before ordering ${product.name}?`,
      answer: `Yes. ${SITE_NAME} can help review the application, confirm suitability, and support your quote request before procurement.`,
    },
  ];
}

export function productImageAlt(product: Product, context = "product image") {
  return `${product.name} by ${SITE_SHORT_NAME} for industrial supply in Nairobi, Kenya - ${context}`;
}
