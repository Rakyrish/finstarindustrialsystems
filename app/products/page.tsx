import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import FAQSection from "@/components/FAQSection";
import {
  BreadcrumbJsonLd,
  CollectionPageJsonLd,
  FAQJsonLd,
} from "@/components/JsonLd";
import ProductsClient from "./ProductsClient";
import { getCategories, getProducts } from "@/lib/api";
import type { Category, Product } from "@/types";
import {
  buildPageMetadata,
  buildCategoryPath,
  catalogueFaqs,
  type BreadcrumbItem,
} from "@/lib/seo";

interface ProductsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const category = typeof params.category === "string" ? params.category : "";
  const search = typeof params.search === "string" ? params.search.trim() : "";

  if (search) {
    return buildPageMetadata({
      title: "Industrial Equipment Search Results in Kenya",
      description:
        "Search the Finstar industrial equipment catalogue for refrigeration, HVAC, cold room, boiler, and engineering products in Kenya.",
      path: "/products",
      noIndex: true,
    });
  }

  if (category) {
    return buildPageMetadata({
      title: "Industrial Product Filters",
      description:
        "Filtered industrial product listings for refrigeration, HVAC, cold room, and boiler equipment in Kenya.",
      path: buildCategoryPath(category),
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: "Industrial Equipment Catalogue in Kenya",
    description:
      "Browse industrial refrigeration equipment, HVAC systems, cold room products, industrial boilers, and engineering fittings supplied by Finstar Industrial Systems Ltd in Nairobi, Kenya and East Africa.",
    path: "/products",
    keywords: [
      "industrial equipment catalogue Kenya",
      "refrigeration equipment suppliers Kenya",
      "industrial engineering Kenya",
      "cold storage solutions East Africa",
    ],
  });
}

async function getProductsPageData(): Promise<{
  products: Product[];
  categories: Category[];
}> {
  const [products, categories] = await Promise.all([
    getProducts({ pageSize: 100 }),
    getCategories(),
  ]);

  return {
    products: products.results,
    categories,
  };
}

export default async function ProductsPage() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let hasApiError = false;

  try {
    const data = await getProductsPageData();
    products = data.products;
    categories = data.categories;
  } catch {
    hasApiError = true;
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
  ];

  return (
    <div>
      <CollectionPageJsonLd
        name="Industrial Equipment Catalogue in Kenya"
        description="Industrial refrigeration, HVAC, cold room, boiler, and engineering product catalogue for Kenya and East Africa."
        path="/products"
        products={products}
      />
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd faqs={catalogueFaqs} />

      <div className="bg-gradient-to-br from-blue-900 to-blue-950 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Breadcrumbs items={breadcrumbs} light />
          <h1 className="mt-6 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            Industrial Equipment Catalogue for Kenya and East Africa
          </h1>
          <p className="seo-summary mt-4 max-w-3xl text-lg leading-8 text-blue-200">
            Explore industrial refrigeration equipment, HVAC systems, cold room solutions, industrial boilers, and engineering fittings supplied from Nairobi by Finstar Industrial Systems Ltd.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-blue-100">
            <Link href="/products/category/refrigeration" className="rounded-full border border-white/20 px-4 py-2 transition hover:bg-white/10">
              Industrial Refrigeration Kenya
            </Link>
            <Link href="/products/category/hvac" className="rounded-full border border-white/20 px-4 py-2 transition hover:bg-white/10">
              HVAC Systems Kenya
            </Link>
            <Link href="/products/category/boilers" className="rounded-full border border-white/20 px-4 py-2 transition hover:bg-white/10">
              Industrial Boilers Kenya
            </Link>
            <Link href="/products/category/cold-rooms" className="rounded-full border border-white/20 px-4 py-2 transition hover:bg-white/10">
              Cold Room Products Kenya
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="mb-10 grid gap-8 lg:grid-cols-[1.65fr_0.85fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              Our Catalogue
            </p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Explore our range of industrial refrigeration, HVAC, boiler, and cooling solutions trusted by businesses across East Africa
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-8 text-slate-600 dark:text-slate-300">
              <p>
                Browse our full range of industrial equipment — from refrigeration compressors and cold room panels to HVAC units, steam boilers, and engineering fittings. Every product is sourced from leading global manufacturers and available for supply, installation, and commissioning across Kenya and East Africa.
              </p>
              <p>
                Use the filters below to narrow by category, or browse our dedicated product ranges to find the right equipment for your project. Our Nairobi team is ready to assist with specifications, delivery timelines, and competitive quotations.
              </p>
            </div>
          </article>

          <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              Browse by Category
            </p>
            <div className="space-y-3">
              <Link href="/products/category/refrigeration" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                Industrial Refrigeration Equipment
              </Link>
              <Link href="/products/category/hvac" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                HVAC and Air Conditioning Systems
              </Link>
              <Link href="/products/category/boilers" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                Industrial Boilers and Steam Systems
              </Link>
              <Link href="/products/category/cold-rooms" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                Cold Room and Cold Storage Products
              </Link>
              <Link href="/contact" className="block rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                Request a quote from Nairobi
              </Link>
            </div>
          </aside>
        </section>

        {hasApiError ? (
          <EmptyState
            title="Failed to load products"
            description="The product catalogue could not be reached. Check the API connection and try again."
            icon="⚠️"
            action={{ label: "Back Home", href: "/" }}
          />
        ) : (
          <ProductsClient initialProducts={products} categories={categories} />
        )}

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <FAQSection
            title="Frequently Asked Questions"
            description="Common questions from engineers, contractors, and procurement teams sourcing industrial equipment in East Africa."
            faqs={catalogueFaqs}
          />

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              Continue Exploring
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Find the right equipment for your project
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Explore our <Link href="/products/category/refrigeration" className="font-semibold text-orange-500 hover:text-orange-600">industrial refrigeration range</Link>, compare <Link href="/products/category/hvac" className="font-semibold text-orange-500 hover:text-orange-600">HVAC systems</Link>, or speak to our Nairobi team for project-specific advice and competitive pricing.
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <Link href="/about" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                About Finstar Industrial Systems
              </Link>
              <Link href="/contact" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Contact our Nairobi sales team
              </Link>
              <Link href="/products/category/fittings" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Browse industrial fittings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
