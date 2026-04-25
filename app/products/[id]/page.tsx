import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById, getRelatedProducts, categories } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.name,
    description: product.shortDescription,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  const related = getRelatedProducts(product, 3);
  const category = categories.find((c) => c.slug === product.category);

  const categoryIcons: Record<string, string> = {
    refrigeration: "❄️",
    hvac: "💨",
    boilers: "🔥",
    "cold-rooms": "🏭",
    fittings: "🔧",
  };

  return (
    <div className="pt-16 lg:pt-20">
      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-slate-500 text-sm flex-wrap" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-800 transition-colors">Home</Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/products" className="hover:text-blue-800 transition-colors">Products</Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link
              href={`/products?category=${product.category}`}
              className="hover:text-blue-800 transition-colors"
            >
              {category?.name}
            </Link>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-900 font-medium truncate max-w-[200px]" title={product.name}>
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      {/* Product Detail */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Image Panel */}
          <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl overflow-hidden aspect-square lg:aspect-auto lg:min-h-[400px] flex items-center justify-center shadow-lg">
            <span className="text-[10rem] opacity-25 select-none">
              {categoryIcons[product.category] || "🏭"}
            </span>
            {/* Category tag */}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur text-blue-900 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                {categoryIcons[product.category]} {category?.name}
              </span>
            </div>
          </div>

          {/* Content Panel */}
          <div className="flex flex-col">
            {/* Category label */}
            <Link
              href={`/products?category=${product.category}`}
              className="text-orange-500 font-semibold text-sm uppercase tracking-widest hover:text-orange-600 mb-2 w-fit"
            >
              {category?.name}
            </Link>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
              {product.name}
            </h1>

            <p className="text-slate-500 leading-relaxed text-base mb-6">
              {product.description}
            </p>

            {/* Specs */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-5 mb-6">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Technical Specifications
                </h2>
                <div className="space-y-2">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 text-sm">
                      <span className="text-slate-400 w-40 shrink-0 font-medium">{key}</span>
                      <span className="text-slate-700 font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="mt-auto flex flex-col sm:flex-row gap-3">
              <Link
                href={`/contact?product=${encodeURIComponent(product.name)}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all duration-200 shadow-lg shadow-orange-500/20"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Inquire About This Product
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:border-blue-800 hover:text-blue-800 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Products
              </Link>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-16 lg:mt-24">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-orange-500 text-sm font-semibold uppercase tracking-widest">
                  More from {category?.name}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">Related Products</h2>
              </div>
              <Link
                href={`/products?category=${product.category}`}
                className="text-blue-800 text-sm font-semibold hover:text-blue-900 flex items-center gap-1"
              >
                View all
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
