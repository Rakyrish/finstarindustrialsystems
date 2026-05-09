import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FAQSection from "@/components/FAQSection";
import {
  BreadcrumbJsonLd,
  CollectionPageJsonLd,
  FAQJsonLd,
} from "@/components/JsonLd";
import ProductCard from "@/components/ProductCard";
import { fetchAllProducts, getCategories } from "@/lib/api";
import { categoryDirectory, getCategoryMeta, navigationCategories } from "@/lib/data";
import {
  buildCategoryMetadata,
  buildCategoryPath,
  catalogueFaqs,
  getCategorySeoContent,
  type BreadcrumbItem,
} from "@/lib/seo";
import type { Category } from "@/types";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Resolve a category by slug.
 * Priority: 1) backend API  2) frontend data.ts definition (graceful fallback)
 * This ensures frontend-defined categories (e.g. "hvac") never 404
 * even when the backend doesn't have that category in the DB yet.
 */
async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const categories = await getCategories();
    const found = categories.find((c) => c.slug === slug);
    if (found) return found;
  } catch {
    // API unavailable — fall through to local definition
  }

  // Fallback: local category definition from data.ts
  const meta = categoryDirectory[slug];
  if (meta) {
    return {
      id: 0,
      name: meta.name,
      slug,
      description: meta.description,
      icon: meta.icon,
      productCount: 0,
    } satisfies Category;
  }

  return null;
}

export async function generateStaticParams() {
  try {
    const [apiCategories] = await Promise.all([getCategories().catch(() => [])]);
    const apiSlugs = new Set(apiCategories.map((c) => c.slug));
    const frontendSlugs = Object.keys(categoryDirectory);

    // Union of backend + frontend slugs
    const allSlugs = [
      ...apiSlugs,
      ...frontendSlugs.filter((s) => !apiSlugs.has(s)),
    ];
    return allSlugs.map((slug) => ({ slug }));
  } catch {
    return Object.keys(categoryDirectory).map((slug) => ({ slug }));
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Category Not Found",
      robots: { index: false, follow: false },
    };
  }

  return buildCategoryMetadata(category);
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const seo = getCategorySeoContent(category);

  // Only fetch products if this category actually exists in the backend (id > 0)
  const products = category.id > 0
    ? await fetchAllProducts({ category: category.slug }).catch(() => [])
    : [];

  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    { name: category.name, href: buildCategoryPath(category.slug) },
  ];

  // Related categories (exclude current, pick 4)
  const relatedCategories = navigationCategories
    .filter((c) => c.slug !== slug)
    .slice(0, 6);

  return (
    <>
      <CollectionPageJsonLd
        name={seo.headline}
        description={seo.description}
        path={buildCategoryPath(category.slug)}
        products={products}
      />
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd faqs={seo.faqs} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Breadcrumbs items={breadcrumbs} light />
          <div className="mt-6 max-w-4xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
              {category.icon} {category.name}
            </p>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              {seo.headline}
            </h1>
            <p className="seo-summary mt-4 max-w-3xl text-lg leading-8 text-blue-100">
              {seo.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Request a Quote
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                All Products
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* SEO description block */}
        <section className="grid gap-8 lg:grid-cols-[1.7fr_0.9fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              {seo.introTitle}
            </p>
            <div className="space-y-4 text-sm leading-8 text-slate-600 dark:text-slate-300">
              {seo.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>

          <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Browse More Categories
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Explore our full range of industrial equipment categories.
            </p>
            <div className="mt-5 space-y-2">
              {relatedCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={buildCategoryPath(cat.slug)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </Link>
              ))}
              <Link
                href="/contact"
                className="block rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300"
              >
                Request a Quote →
              </Link>
            </div>
          </aside>
        </section>

        {/* Products grid */}
        <section className="mt-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
                Available Products
              </p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {category.name} — Kenya & East Africa
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {products.length} product{products.length === 1 ? "" : "s"} in this category
            </p>
          </div>

          {products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
              <div className="text-5xl mb-4">{category.icon}</div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                Products coming soon to this category.
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Contact our Nairobi team for current availability and sourcing support.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Contact Finstar
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* FAQs */}
        <section className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <FAQSection
            title={`${category.name} — Common Questions`}
            description="Common questions from buyers, engineers, and procurement teams."
            faqs={seo.faqs}
          />
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              Continue Exploring
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Keep exploring the catalogue
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Continue to the{" "}
              <Link href="/products" className="font-semibold text-orange-500 hover:text-orange-600">
                full industrial equipment catalogue
              </Link>
              , compare related categories, or contact Finstar for a tailored quotation.
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <Link href="/products" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300">
                Browse all products
              </Link>
              <Link href="/about" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300">
                About Finstar Industrial Systems
              </Link>
              <Link href="/contact" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300">
                Request pricing and delivery support
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <FAQSection
            title="More About Industrial Equipment Supply"
            description="Additional questions about sourcing, delivery, and product support across Kenya and East Africa."
            faqs={catalogueFaqs}
          />
        </section>
      </div>
    </>
  );
}
