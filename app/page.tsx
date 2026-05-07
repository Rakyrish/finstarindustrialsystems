import type { Metadata } from "next";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import FAQSection from "@/components/FAQSection";
import { FAQJsonLd, ReviewAggregateJsonLd, ServicesJsonLd } from "@/components/JsonLd";
import FeaturedProducts from "@/components/FeaturedProducts";
import SectionWrapper, { SectionHeader } from "@/components/SectionWrapper";
import ClientsSection, { type Client } from "@/components/ClientsSection"
import BrandsSection from "@/components/BrandSection";
import ReviewsSection, { type GoogleReview } from "@/components/ReviewsSection";
import { getCategories, fetchAllProducts } from "@/lib/api";
import { services } from "@/lib/data";
import { buildPageMetadata, homepageFaqs, SITE_URL } from "@/lib/seo";
import { Category, Product } from "@/types";

export const metadata: Metadata = buildPageMetadata({
  title: "Industrial Refrigeration, HVAC, Boiler and Cold Room Solutions in Kenya",
  description:
    "Finstar Industrial Systems Ltd supplies industrial refrigeration equipment, HVAC systems, cold room products, industrial boilers, and engineering fittings in Nairobi, Kenya and across East Africa.",
  path: "/",
  keywords: [
    "industrial refrigeration Kenya",
    "HVAC systems Kenya",
    "industrial boilers Kenya",
    "cold room installation Kenya",
    "industrial engineering Kenya",
  ],
});

const clients: Client[] = [
  { name: "H Young & Company (EA) Ltd", logoUrl: "/HYoung.png" },
  { name: "Persea", logoUrl: "/persea.png" },
  { name: "A to Z Group Limited", logoUrl: "/atoz.png" },
  { name: "JKUAT", logoUrl: "/jkuat.png" },
  { name: "Seco", logoUrl: "/seco.png" },
  { name: "Bulk Stream", logoUrl: "/bulk.png" },
  { name: "Auto", logoUrl: "/auto.png" },
  { name: "Olesereni Hotel", logoUrl: "/olesereni.png" },
];

const brands = [
  { name: "Riello", logoUrl: "/riello.png" },
  { name: "Secop", logoUrl: "/secop.png" },
  { name: "Baite", logoUrl: "/baite.png" },
  { name: "Spirax", logoUrl: "/spirax.png" },
  { name: "Suniso", logoUrl: "/suniso.png" },
  { name: "Emkarate", logoUrl: "/emkarate.png" },
  { name: "Nu Way", logoUrl: "/nuway.png" },
  { name: "Baltur", logoUrl: "/baltur.png" },
  { name: "Danfoss", logoUrl: "/danfoss.png" },
  { name: "Gree", logoUrl: "/gree.png" },
  { name: "LG", logoUrl: "/lg.png" },
  { name: "Maxron", logoUrl: "/maxron.png" },
  { name: "Westron", logoUrl: "/westron.png" },
  { name: "Maksal", logoUrl: "/maksal.png" },
  { name: "autoflame", logoUrl: "/autoflame.png" },
  { name: "john thompson", logoUrl: "/jthompson.png" },


];

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getHomepageData(): Promise<{
  categories: Category[];
  featuredProducts: Product[];
}> {
  const [categories, allProducts] = await Promise.all([
    getCategories(),
    // fetchAllProducts() auto-paginates — every product is available for featured sections
    fetchAllProducts(),
  ]);

  // Pass the full product list — FeaturedProducts handles the display cap per category.
  return { categories, featuredProducts: allProducts };
}

// Fetch Google reviews via our own API route (ISR-cached 24h server-side)
async function getReviews(): Promise<{
  reviews: GoogleReview[];
  overallRating: number;
  totalRatings: number;
}> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? SITE_URL;
    const res = await fetch(`${baseUrl}/api/reviews`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error("Reviews fetch failed");
    return res.json();
  } catch {
    return { reviews: [], overallRating: 4.8, totalRatings: 0 };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  let categories: Category[] = [];
  let featuredProducts: Product[] = [];
  let hasApiError = false;
  let reviews: GoogleReview[] = [];
  let overallRating = 4.8;
  let totalRatings = 0;

  const [productData, reviewData] = await Promise.allSettled([
    getHomepageData(),
    getReviews(),
  ]);

  if (productData.status === "fulfilled") {
    categories = productData.value.categories;
    featuredProducts = productData.value.featuredProducts;
  } else {
    hasApiError = true;
  }

  if (reviewData.status === "fulfilled") {
    reviews = reviewData.value.reviews;
    overallRating = reviewData.value.overallRating;
    totalRatings = reviewData.value.totalRatings;
  }

  return (
    <>
      <FAQJsonLd faqs={homepageFaqs} />
      <ServicesJsonLd services={services.map((service) => ({ title: service.title, description: service.description }))} />
      {totalRatings > 0 && (
        <ReviewAggregateJsonLd ratingValue={overallRating} reviewCount={totalRatings} />
      )}

      {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
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

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
          {/* Trust pill */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-700/50 bg-blue-800/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-blue-200 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
            Trusted by 500+ clients across East Africa
          </div>

          <h1 className="mb-5 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-7xl">
            Industrial Equipment &{" "}
            <span className="text-orange-400">Cooling</span> Solutions
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-lg leading-relaxed text-blue-200 sm:text-xl">
            From precision refrigeration systems to industrial boilers, we
            supply and install world-class equipment for businesses across East
            Africa.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-4 text-base font-bold text-white shadow-2xl shadow-orange-500/30 transition-all duration-200 hover:bg-orange-400 hover:shadow-orange-400/40"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-3">
            {[
              { value: "500+", label: "Clients Served" },
              { value: "1000+", label: "Products" },
              { value: "24/7", label: "Support Available" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold text-orange-400">{stat.value}</div>
                <div className="mt-1 text-sm text-blue-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── 2. FEATURED PRODUCTS ─────────────────────────────────────────────── */}
      <SectionWrapper className="py-12 lg:py-16">
        <SectionHeader
          subtitle="Top Picks"
          title="Featured Products"
          description="Our most popular industrial equipment, trusted by leading companies across East Africa."
        />

        {featuredProducts.length > 0 ? (
          <FeaturedProducts
            desktopRowLimit={8}
            featuredProducts={featuredProducts}
            categories={categories}
          />
        ) : (
          <EmptyState
            title={hasApiError ? "Failed to load products" : "No products available yet"}
            description="Equipment will appear here after products are published in the backend."
            icon="🏭"
            action={{ label: "View Catalog", href: "/products" }}
          />
        )}
      </SectionWrapper>

      {/* ── 3. BRANDS ────────────────────────────────────────────────────────── */}
      <SectionWrapper className="bg-slate-50 py-12 dark:bg-slate-900/50 lg:py-16">
        <BrandsSection brands={brands} />
      </SectionWrapper>

      {/* ── 4. CLIENTS ───────────────────────────────────────────────────────── */}
      <SectionWrapper className="bg-slate-50 py-12 dark:bg-slate-900/50 lg:py-16">
        <ClientsSection clients={clients} />
      </SectionWrapper>


      {/* ── 5. GOOGLE REVIEWS ────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <SectionWrapper>
          <SectionHeader
            subtitle="Google Reviews"
            title="What Our Clients Say"
            description="Trusted by businesses across East Africa with glowing reviews on Google."
          />
          <ReviewsSection
            reviews={reviews}
            overallRating={overallRating}
            totalRatings={totalRatings}
          />
        </SectionWrapper>
      )}

      {/* ── 6. SERVICES ──────────────────────────────────────────────────────── */}
      <SectionWrapper dark className="bg-slate-900 py-12 lg:py-16">
        <SectionHeader
          subtitle="Our Services"
          title="What We Do"
          description="Complete solutions from design and supply to installation, commissioning and ongoing maintenance."
          light
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="group rounded-2xl border border-slate-700 bg-slate-800/60 p-5 backdrop-blur transition-all duration-300 hover:border-orange-500/50 hover:bg-slate-800"
            >
              <div className="mb-3 text-3xl">{service.icon}</div>
              <h3 className="mb-1.5 text-sm font-bold text-white transition-colors group-hover:text-orange-400">
                {service.title}
              </h3>
              <p className="text-xs leading-relaxed text-slate-400">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper className="bg-slate-50 py-12 dark:bg-slate-900/50 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              Why Finstar
            </p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Your specialist partner for industrial systems across East Africa
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-8 text-slate-600 dark:text-slate-300">
              <p>
                Finstar Industrial Systems Ltd is Nairobi&apos;s trusted source for industrial refrigeration equipment, HVAC systems, cold room solutions, industrial boilers, and engineering fittings. We work directly with procurement teams, contractors, facility managers, and engineers to source the right equipment for every project.
              </p>
              <p>
                From precision cooling systems and high-efficiency HVAC installations to steam boilers and custom cold storage builds, we support projects across Kenya, Uganda, Tanzania, Rwanda, DRC Congo, and Burundi — delivering world-class equipment backed by local expertise and after-sales support.
              </p>
            </div>
          </article>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              Explore Our Range
            </p>
            <div className="space-y-3 text-sm">
              <Link href="/products/category/refrigeration" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Industrial Refrigeration
              </Link>
              <Link href="/products/category/hvac" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                HVAC Systems
              </Link>
              <Link href="/products/category/boilers" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Industrial Boilers
              </Link>
              <Link href="/products/category/cold-rooms" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Cold Room Solutions
              </Link>
              <Link href="/contact" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Request a Quote
              </Link>
            </div>
          </aside>
        </div>
      </SectionWrapper>

      <SectionWrapper className="py-12 lg:py-16">
        <FAQSection
          title="Frequently Asked Questions"
          description="Common questions from engineers, procurement teams, and facility managers across East Africa."
          faqs={homepageFaqs}
        />
      </SectionWrapper>

      {/* ── 7. CTA ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-14">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 50%, white 0%, transparent 50%), radial-gradient(circle at 75% 50%, white 0%, transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-3 text-3xl font-extrabold text-white lg:text-4xl">
            Ready to Upgrade Your Industrial Systems?
          </h2>
          <p className="mx-auto mb-7 max-w-2xl text-lg text-orange-100">
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
            <a
              href="https://www.google.com/maps/place/Finstar+Industrial+Systems+Ltd/@-1.3050988,36.8390376,837m/data=!3m2!1e3!4b1!4m6!3m5!1s0x182f11c670b98d43:0x6f348874e48071b5!8m2!3d-1.3050988!4d36.8390376!16s%2Fg%2F11x8c2x1hk?entry=ttu&g_ep=EgoyMDI2MDQyNy4wIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Find Us on Map
            </a>
          </div>
        </div>
      </section >
    </>

  );
}
