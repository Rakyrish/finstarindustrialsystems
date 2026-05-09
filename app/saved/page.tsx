"use client";

import Image from "next/image";
import Link from "next/link";
import { useSavedProducts } from "@/lib/useSavedProducts";
import { buildCategoryPath } from "@/lib/seo";

export default function SavedProductsPage() {
  const { savedProducts, removeProduct, clearAll, mounted } = useSavedProducts();

  const quoteMessage = savedProducts.length > 0
    ? `Hello, I would like to request a quote for the following products:\n\n${savedProducts.map((p, i) => `${i + 1}. ${p.name}`).join("\n")}\n\nPlease provide pricing and availability.`
    : "";

  const whatsappUrl = `https://wa.me/254726559606?text=${encodeURIComponent(quoteMessage)}`;
  const contactUrl = `/contact?products=${encodeURIComponent(savedProducts.map((p) => p.name).join(", ")).slice(0, 200)}`;

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading saved products…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-white mb-4 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to products
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400 mb-2">Your Shortlist</p>
              <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
                Saved Products
              </h1>
              <p className="mt-3 text-blue-200 text-base">
                {savedProducts.length === 0
                  ? "No products saved yet. Browse the catalogue and bookmark products you're interested in."
                  : `You have ${savedProducts.length} saved product${savedProducts.length === 1 ? "" : "s"}. Request a quote for all of them at once.`}
              </p>
            </div>
            {savedProducts.length > 0 && (
              <button
                onClick={clearAll}
                className="shrink-0 rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Bulk quote CTAs */}
          {savedProducts.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={contactUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Request Quote by Email
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.029 18.88a7.2 7.2 0 01-3.434-.873l-3.814 1.001 1.022-3.728A7.2 7.2 0 014.8 12.03C4.8 8.032 8.03 4.8 12.029 4.8c3.997 0 7.2 3.231 7.2 7.23 0 3.998-3.203 7.2-7.2 7.2z"/>
                </svg>
                Request via WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {savedProducts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {savedProducts.map((product, idx) => (
              <div
                key={product.id}
                className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-all hover:shadow-md"
              >
                {/* Image */}
                {product.imageUrl ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-3xl">
                    🔧
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-0.5">
                    {product.categoryName}
                  </p>
                  <Link
                    href={`/products/${product.slug}`}
                    className="font-semibold text-slate-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-1"
                  >
                    {product.name}
                  </Link>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Saved {new Date(product.savedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/products/${product.slug}`}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-orange-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => removeProduct(product.id)}
                    aria-label={`Remove ${product.name} from saved`}
                    className="rounded-xl border border-red-200 dark:border-red-900/40 px-3 py-1.5 text-xs font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        {savedProducts.length > 0 && (
          <div className="mt-10 rounded-3xl border border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-900/10 p-6 text-center">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-1">
              Ready to enquire about these {savedProducts.length} products?
            </p>
            <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mb-4">
              Our Nairobi team will provide pricing, availability, and delivery details.
            </p>
            <Link
              href={contactUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Request a Quote for All Saved Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-4xl">
        🔖
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">No saved products yet</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        Browse the catalogue and click the bookmark icon on any product to save it here for a future quote request.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          Browse Products
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:border-orange-300 hover:text-orange-600"
        >
          Contact Finstar
        </Link>
      </div>
    </div>
  );
}
