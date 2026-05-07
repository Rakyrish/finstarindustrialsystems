import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import ContactButtons from "@/components/ContactButtons";
import FAQSection from "@/components/FAQSection";
import {
  BreadcrumbJsonLd,
  ProductJsonLd,
} from "@/components/JsonLd";
import ProductCard from "@/components/ProductCard";
import ProductDescription from "@/components/ProductDescription";
import { APIError, getProductBySlug, getProducts, isAPIError } from "@/lib/api";
import { getCategoryIcon } from "@/lib/data";
import {
  buildCategoryPath,
  buildProductFaqs,
  buildProductMetadata,
  productImageAlt,
  stripHtml,
  type BreadcrumbItem,
} from "@/lib/seo";
import type { Product } from "@/types";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

async function getProductOrNotFound(slug: string) {
  try {
    return await getProductBySlug(slug);
  } catch (error) {
    if (isAPIError(error) && error.status === 404) notFound();
    throw error;
  }
}

async function getRelatedProducts(product: Product) {
  const response = await getProducts({ category: product.category.slug, pageSize: 8 });
  return response.results.filter((item) => item.slug !== product.slug).slice(0, 4);
}

export async function generateStaticParams() {
  try {
    const products = await getProducts({ pageSize: 100 });
    return products.results.map((product) => ({ slug: product.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    return buildProductMetadata(product);
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      return { title: "Product Not Found", robots: { index: false, follow: false } };
    }
    return {
      title: "Product Details",
      description: "Industrial product details from Finstar Industrial Systems Ltd.",
    };
  }
}

function EnquireIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductOrNotFound(slug);
  const relatedProducts = await getRelatedProducts(product);
  const categoryIcon = getCategoryIcon(product.category.slug, product.category.icon);
  const faqs = buildProductFaqs(product);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    { name: product.category.name, href: buildCategoryPath(product.category.slug) },
    { name: product.name, href: `/products/${product.slug}` },
  ];

  return (
    <div>
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd items={breadcrumbs} />

      <div className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-lg dark:from-slate-800 dark:to-slate-900 lg:min-h-[400px]">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={productImageAlt(product)}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <span className="select-none text-[10rem] opacity-25">{categoryIcon}</span>
            )}
            <div className="absolute left-4 top-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-slate-200">
                {categoryIcon} {product.category.name}
              </span>
            </div>
            <div className="absolute bottom-4 right-4 rounded-2xl border border-white/20 bg-white/80 p-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
              <Image
                src="/logo.png"
                width={56}
                height={56}
                alt="Finstar Industrial Systems Ltd logo"
                className="h-10 w-10 object-contain"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <Link
              href={buildCategoryPath(product.category.slug)}
              className="mb-2 w-fit text-sm font-semibold uppercase tracking-[0.18em] text-orange-500 hover:text-orange-600"
            >
              {product.category.name}
            </Link>

            <h1 className="text-2xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            <p className="seo-summary mt-4 text-sm leading-8 text-slate-600 dark:text-slate-300">
              {product.shortDescription || stripHtml(product.description) || "Industrial product supplied by Finstar Industrial Systems Ltd in Nairobi, Kenya and East Africa."}
            </p>

            <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 dark:border-orange-500/20 dark:bg-orange-500/10">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">
                Product Relevance for Kenya and East Africa
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                This product page is optimized for engineers, contractors, facility teams, and procurement managers comparing industrial equipment in Nairobi, Kenya, and regional East African markets.
              </p>
            </div>

            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="mt-6 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/50">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300">
                  Technical Specifications
                </h2>
                <div className="space-y-2">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 text-sm">
                      <span className="w-40 shrink-0 font-medium text-slate-400 dark:text-slate-500">{key}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Request pricing, delivery, and application support
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                Speak to Finstar Industrial Systems Ltd about supply timelines, technical suitability, and delivery coverage in Kenya, Uganda, Tanzania, Rwanda, DRC Congo, and Burundi.
              </p>
              <ContactButtons productName={product.name} />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/contact?product=${encodeURIComponent(product.name)}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                >
                  <EnquireIcon />
                  Inquire About This Product
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 px-6 py-4 font-semibold text-slate-700 transition hover:border-orange-400 hover:text-orange-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-400 dark:hover:text-orange-400"
                >
                  <BackIcon />
                  Back to Products
                </Link>
              </div>
            </div>
          </div>
        </div>

        {product.description && (
          <section className="mt-14 lg:mt-20">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm text-white">
                  📋
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Full Product Details
                </h2>
              </div>
              <div className="px-6 py-8 sm:px-8">
                <ProductDescription content={product.description} />
              </div>
            </div>
          </section>
        )}

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <FAQSection
            title={`${product.name} FAQs`}
            description="These FAQ entries improve long-tail search coverage, AI-search visibility, and quote readiness for this product in Kenya and East Africa."
            faqs={faqs}
          />

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              Internal Linking
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Explore related industrial supply paths
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Continue to the <Link href={buildCategoryPath(product.category.slug)} className="font-semibold text-orange-500 hover:text-orange-600">{product.category.name} category in Kenya</Link>, browse the full <Link href="/products" className="font-semibold text-orange-500 hover:text-orange-600">industrial equipment catalogue in Kenya</Link>, or contact our Nairobi team for procurement support.
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <Link href={buildCategoryPath(product.category.slug)} className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                More {product.category.name} products
              </Link>
              <Link href="/products/category/refrigeration" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Industrial refrigeration Kenya
              </Link>
              <Link href="/contact" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Request a quote from Finstar
              </Link>
            </div>
          </aside>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-16 lg:mt-24">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
                  Related Products
                </span>
                <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                  More {product.category.name} products in Kenya
                </h2>
              </div>
              <Link
                href={buildCategoryPath(product.category.slug)}
                className="text-sm font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
              >
                View category
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
