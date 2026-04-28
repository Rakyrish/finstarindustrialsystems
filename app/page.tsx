
import type { Metadata } from "next";
import Link from "next/link";
import CategoryCard from "@/components/CategoryCard";
import EmptyState from "@/components/EmptyState";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/JsonLd";
import ProductCard from "@/components/ProductCard";
import SectionWrapper, { SectionHeader } from "@/components/SectionWrapper";
import { getCategories, getProducts } from "@/lib/api";
import { services } from "@/lib/data";
import { Category, Product } from "@/types";

export const metadata: Metadata = {
  title: "Industrial Refrigeration, HVAC & Boiler Solutions in Kenya",
  description:
    "Finstar Industrial Systems - Kenya's leading supplier and installer of industrial refrigeration, air conditioning (HVAC), steam boilers, cold rooms, and industrial fittings.",
  alternates: { canonical: "/" },
  openGraph: {
    title:
      "Finstar Industrial Systems | Refrigeration, HVAC & Boiler Solutions Kenya",
    description:
      "Kenya's leading supplier and installer of industrial refrigeration, HVAC, boilers, cold rooms and industrial fittings.",
    url: "https://finstarindustrial.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Finstar Industrial Systems",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finstar Industrial Systems | Refrigeration, HVAC & Boilers Kenya",
    description:
      "Kenya's leading supplier and installer of industrial refrigeration, HVAC and boilers.",
    images: ["/og-image.png"],
  },
};

async function getHomepageData(): Promise<{
  categories: Category[];
  featuredProducts: Product[];
}> {
  const [categories, featuredProducts] = await Promise.all([
    getCategories(),
    getProducts({ featured: true, pageSize: 6 }),
  ]);

  return {
    categories,
    featuredProducts: featuredProducts.results,
  };
}

export default async function HomePage() {
  let categories: Category[] = [];
  let featuredProducts: Product[] = [];
  let hasApiError = false;

  try {
    const data = await getHomepageData();
    categories = data.categories;
    featuredProducts = data.featuredProducts;
  } catch {
    hasApiError = true;
  }

  return (
    <>
      <OrganizationJsonLd />
      <WebsiteJsonLd />

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900" />
        <div className="absolute top-1/4 left-10 h-64 w-64 rounded-full bg-blue-700/10 blur-3xl" />
        <div className="absolute right-10 bottom-1/4 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-blue-800/20 to-transparent" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-32 text-center sm:px-6 lg:px-8 lg:py-40">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-700/50 bg-blue-800/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-blue-200 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
            Industrial Excellence Since 2005
          </div>

          <h1 className="mb-6 text-4xl leading-tight font-extrabold text-white sm:text-5xl lg:text-7xl">
            Industrial Equipment & <span className="text-orange-400">Cooling</span>{" "}
            Solutions
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-blue-200 sm:text-xl">
            From precision refrigeration systems to industrial boilers, we supply
            and install world-class equipment for businesses across East Africa.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-4 text-base font-bold text-white shadow-2xl shadow-orange-500/30 transition-all duration-200 hover:bg-orange-400 hover:shadow-orange-400/40"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              Contact Us
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
            >
              Explore Products
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>

          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: "500+", label: "Clients Served" },
              { value: "20+", label: "Years Experience" },
              { value: "5", label: "Product Categories" },
              { value: "24/7", label: "Support Available" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold text-orange-400">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-blue-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </section>

      <SectionWrapper className="bg-slate-50">
        <SectionHeader
          subtitle="What We Offer"
          title="Our Product Categories"
          description="We supply and install a comprehensive range of industrial systems and equipment tailored to your needs."
        />
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={hasApiError ? "Failed to load categories" : "No categories available"}
            description="The product categories will appear here once the backend data is available."
            icon="📦"
            action={{ label: "Browse Products", href: "/products" }}
          />
        )}
      </SectionWrapper>

      <SectionWrapper>
        <SectionHeader
          subtitle="Top Picks"
          title="Featured Products"
          description="Explore our most popular industrial equipment trusted by leading companies across East Africa."
        />
        {featuredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-800 px-8 py-3.5 font-semibold text-blue-800 transition-all duration-200 hover:bg-blue-800 hover:text-white"
              >
                View All Products
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </>
        ) : (
          <EmptyState
            title={hasApiError ? "Failed to load products" : "No featured products yet"}
            description="Featured equipment will appear here after products are published in the backend."
            icon="🏭"
            action={{ label: "View Catalog", href: "/products" }}
          />
        )}
      </SectionWrapper>

      <SectionWrapper dark className="bg-slate-900">
        <SectionHeader
          subtitle="Our Services"
          title="What We Do"
          description="Complete solutions from design and supply to installation, commissioning and ongoing maintenance."
          light
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="group rounded-2xl border border-slate-700 bg-slate-800/60 p-6 backdrop-blur transition-all duration-300 hover:border-orange-500/50 hover:bg-slate-800"
            >
              <div className="mb-3 text-3xl">{service.icon}</div>
              <h3 className="mb-2 text-base font-bold text-white transition-colors group-hover:text-orange-400">
                {service.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper className="bg-white">
        <SectionHeader
          subtitle="Why Finstar"
          title="Built for Industry, Trusted by Business"
          description="We combine technical excellence with local expertise to deliver solutions that last."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "🎯",
              title: "Expert Engineers",
              text: "Our certified engineers bring decades of hands-on industrial experience.",
            },
            {
              icon: "⚙️",
              title: "Premium Equipment",
              text: "We source only top-tier equipment from internationally certified manufacturers.",
            },
            {
              icon: "🔄",
              title: "End-to-End Service",
              text: "From design and supply to installation, commissioning, and ongoing maintenance.",
            },
            {
              icon: "⚡",
              title: "Fast Response",
              text: "24/7 emergency support to minimise downtime and keep your operations running.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl bg-slate-50 p-6 text-center transition-colors duration-300 hover:bg-blue-50"
            >
              <div className="mb-4 text-4xl">{item.icon}</div>
              <h3 className="mb-2 font-bold text-slate-900 transition-colors group-hover:text-blue-800">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-500">{item.text}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 50%, white 0%, transparent 50%), radial-gradient(circle at 75% 50%, white 0%, transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-extrabold text-white lg:text-4xl">
            Ready to Upgrade Your Industrial Systems?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-orange-100">
            Get in touch today for a free consultation and custom quote from our
            expert team.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-orange-600 shadow-xl transition-all duration-200 hover:bg-orange-50"
            >
              Contact Us Today
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-orange-600 px-8 py-4 text-base font-bold text-white transition-all duration-200 hover:bg-orange-700"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
