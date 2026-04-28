import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/JsonLd";
import ProductCard from "@/components/ProductCard";
import { APIError, getProductBySlug, getProducts, isAPIError } from "@/lib/api";
import { getCategoryIcon } from "@/lib/data";
import { Product } from "@/types";
import ContactButtons from "@/components/ContactButtons";

const BASE_URL = "https://finstarindustrial.com";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

async function getProductOrNotFound(slug: string) {
  try {
    return await getProductBySlug(slug);
  } catch (error) {
    if (isAPIError(error) && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

async function getRelatedProducts(product: Product) {
  const response = await getProducts({
    category: product.category.slug,
    pageSize: 4,
  });

  return response.results.filter((item) => item.slug !== product.slug).slice(0, 3);
}

export async function generateStaticParams() {
  try {
    const products = await getProducts({ pageSize: 100 });
    return products.results.map((product) => ({ slug: product.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getProductBySlug(slug);
    const description = (product.shortDescription || product.description).slice(0, 160);

    return {
      title: product.name,
      description,
      keywords: [
        product.name,
        product.category.name,
        "industrial equipment Kenya",
        "Finstar Industrial Systems",
      ],
      alternates: { canonical: `/products/${product.slug}` },
      openGraph: {
        title: `${product.name} | Finstar Industrial Systems`,
        description,
        url: `${BASE_URL}/products/${product.slug}`,
        type: "website",
        siteName: "Finstar Industrial Systems",
        images: product.imageUrl
          ? [
            {
              url: product.imageUrl,
              width: 1200,
              height: 630,
              alt: product.name,
            },
          ]
          : [
            {
              url: "/og-image.png",
              width: 1200,
              height: 630,
              alt: product.name,
            },
          ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${product.name} | Finstar Industrial Systems`,
        description,
        images: product.imageUrl ? [product.imageUrl] : ["/og-image.png"],
      },
    };
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      return { title: "Product Not Found" };
    }

    return {
      title: "Product Details",
      description: "Industrial equipment details from Finstar Industrial Systems.",
    };
  }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductOrNotFound(slug);
  const relatedProducts = await getRelatedProducts(product);
  const categoryIcon = getCategoryIcon(product.category.slug, product.category.icon);

  return (
    <div>
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Products", href: "/products" },
          {
            name: product.category.name,
            href: `/products?category=${product.category.slug}`,
          },
          { name: product.name, href: `/products/${product.slug}` },
        ]}
      />

      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <nav
            className="flex flex-wrap items-center gap-2 text-sm text-slate-500"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-blue-800">
              Home
            </Link>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <Link href="/products" className="transition-colors hover:text-blue-800">
              Products
            </Link>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="transition-colors hover:text-blue-800"
            >
              {product.category.name}
            </Link>
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span
              className="max-w-[200px] truncate font-medium text-slate-900"
              title={product.name}
            >
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-lg lg:min-h-[400px]">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <span className="select-none text-[10rem] opacity-25">{categoryIcon}</span>
            )}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-blue-900 shadow-sm backdrop-blur">
                {categoryIcon} {product.category.name}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <Link
              href={`/products?category=${product.category.slug}`}
              className="mb-2 w-fit text-sm font-semibold uppercase tracking-widest text-orange-500 hover:text-orange-600"
            >
              {product.category.name}
            </Link>

            <h1 className="mb-4 text-2xl leading-tight font-extrabold text-slate-900 sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            <p className="mb-6 text-base leading-relaxed text-slate-500">
              {product.description}
            </p>

            {product.specs && Object.keys(product.specs).length > 0 ? (
              <div className="mb-6 rounded-2xl bg-slate-50 p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">
                  Technical Specifications
                </h2>
                <div className="space-y-2">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 text-sm">
                      <span className="w-40 shrink-0 font-medium text-slate-400">
                        {key}
                      </span>
                      <span className="font-semibold text-slate-700">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-auto flex flex-col gap-3">
              {/* WhatsApp & Call buttons */}
              <ContactButtons productName={product.name} />

              {/* Inquire & Back links */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/contact?product=${encodeURIComponent(product.name)}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-4 font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:bg-orange-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  Inquire About This Product
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-6 py-4 font-semibold text-slate-700 transition-all duration-200 hover:border-blue-800 hover:text-blue-800"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back to Products
                </Link>
              </div>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 ? (
          <div className="mt-16 lg:mt-24">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold uppercase tracking-widest text-orange-500">
                  More from {product.category.name}
                </span>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Related Products
                </h2>
              </div>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="flex items-center gap-1 text-sm font-semibold text-blue-800 hover:text-blue-900"
              >
                View all
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
