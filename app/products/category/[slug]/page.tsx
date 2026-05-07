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
import { getCategories, getProducts } from "@/lib/api";
import {
  buildCategoryMetadata,
  buildCategoryPath,
  catalogueFaqs,
  getCategorySeoContent,
  type BreadcrumbItem,
} from "@/lib/seo";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

async function getCategoryBySlug(slug: string) {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug);
}

export async function generateStaticParams() {
  try {
    const categories = await getCategories();
    return categories.map((category) => ({ slug: category.slug }));
  } catch {
    return [];
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
  const productsResponse = await getProducts({ category: category.slug, pageSize: 100 });
  const products = productsResponse.results;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    { name: category.name, href: buildCategoryPath(category.slug) },
  ];

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

      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Breadcrumbs items={breadcrumbs} light />
          <div className="mt-6 max-w-4xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
              {category.name}
            </p>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              {seo.headline}
            </h1>
            <p className="seo-summary mt-4 max-w-3xl text-lg leading-8 text-blue-100">
              {seo.description}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
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
              Explore More Industrial Categories
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Browse our full range of industrial equipment categories and find the right solution for your project.
            </p>
            <div className="mt-5 space-y-2">
              <Link href="/products/category/refrigeration" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                Industrial Refrigeration Kenya
              </Link>
              <Link href="/products/category/hvac" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                HVAC Systems Kenya
              </Link>
              <Link href="/products/category/boilers" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                Industrial Boilers Kenya
              </Link>
              <Link href="/products/category/cold-rooms" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                Cold Room Products Kenya
              </Link>
              <Link href="/contact" className="block rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                Request a Quote from Nairobi
              </Link>
            </div>
          </aside>
        </section>

        <section className="mt-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
                Available Products
              </p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {category.name} catalogue for Kenya and East Africa
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {products.length} product{products.length === 1 ? "" : "s"} in this category
            </p>
          </div>

          {products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                No products are published in this category yet.
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

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <FAQSection
            title={`${category.name} — Common Questions`}
            description="Common questions from buyers, engineers, and procurement teams about this product category."
            faqs={seo.faqs}
          />

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              Explore Further
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Keep exploring the catalogue
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Continue to the full <Link href="/products" className="font-semibold text-orange-500 hover:text-orange-600">industrial equipment catalogue in Kenya</Link>, compare related categories, or contact Finstar Industrial Systems Ltd for a tailored quotation.
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <Link href="/products" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Browse all products
              </Link>
              <Link href="/about" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Learn about Finstar Industrial Systems Ltd
              </Link>
              <Link href="/contact" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
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
