"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { Category, Product } from "@/types";

interface FeaturedProductsProps {
    featuredProducts: Product[];
    categories: Category[];
}

export default function FeaturedProducts({
    featuredProducts,
    categories,
}: FeaturedProductsProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const deferredQuery = useDeferredValue(searchQuery);

    const filteredProducts = useMemo(() => {
        const q = deferredQuery.trim().toLowerCase();
        if (!q) return featuredProducts;
        return featuredProducts.filter(
            (product) =>
                product.name.toLowerCase().includes(q) ||
                product.shortDescription.toLowerCase().includes(q) ||
                product.category.name.toLowerCase().includes(q),
        );
    }, [deferredQuery, featuredProducts]);

    // Always show categories that have 2+ total products (not filtered count).
    // During search, show matched products inside each category.
    // If search produces 0 matches in a category, show the category header
    // with an empty-state message rather than hiding it entirely.
    const productsByCategory = useMemo(() => {
        return categories
            .map((category) => {
                // Total products in this category (ignoring search)
                const totalProducts = featuredProducts.filter(
                    (p) => p.category.slug === category.slug,
                );
                // Products matching the current search within this category
                const matchedProducts = filteredProducts.filter(
                    (p) => p.category.slug === category.slug,
                );
                return { category, products: matchedProducts, total: totalProducts.length };
            })
            // Only include categories that have 2 or more total products
            .filter(({ total }) => total >= 2);
    }, [categories, featuredProducts, filteredProducts]);

    const uncategorised = filteredProducts.filter(
        (product) =>
            !categories.some((category) => category.slug === product.category.slug),
    );

    // Global search has results if any category has matched products OR uncategorised has results
    const hasAnyResults =
        productsByCategory.some(({ products }) => products.length > 0) ||
        uncategorised.length > 0;

    const isSearching = deferredQuery.trim().length > 0;

    return (
        <div>
            {/* Search bar */}
            <div className="relative mb-8 max-w-xl">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search featured products e.g. refrigeration, boiler..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 pr-10 pl-11 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none transition"
                />
                <svg
                    className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Global no-results (only when searching AND truly nothing matches anywhere) */}
            {isSearching && !hasAnyResults ? (
                <div className="py-16 text-center">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                        No products match &ldquo;{searchQuery}&rdquo;
                    </p>
                    <button
                        onClick={() => setSearchQuery("")}
                        className="mt-3 text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors"
                    >
                        Clear search
                    </button>
                </div>
            ) : (
                <div className="space-y-12">
                    {productsByCategory.map(({ category, products, total }) => (
                        <div key={category.id}>
                            {/* Category subheading */}
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-md whitespace-nowrap font-bold text-orange-500 dark:text-orange-400">
                                        {category.name}
                                    </h3>
                                    <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                        {/* Show matched count during search, total otherwise */}
                                        {isSearching ? `${products.length} of ${total}` : total}
                                    </span>
                                </div>
                                <Link
                                    href={`/products?category=${category.slug}`}
                                    className="flex whitespace-nowrap items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                                >
                                    View all
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>

                            {/* Orange gradient divider */}
                            <div className="mb-6 h-px bg-gradient-to-r from-orange-400 via-orange-200 to-transparent dark:from-orange-600 dark:via-orange-900/40" />

                            {/* Products grid or per-category empty state */}
                            {products.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
                                    {products.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            ) : (
                                /* Category is visible but search matched nothing inside it */
                                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 py-10 text-center">
                                    <p className="text-2xl">📦</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        No products in this category match &ldquo;{searchQuery}&rdquo;
                                    </p>
                                    <Link
                                        href={`/products?category=${category.slug}`}
                                        className="text-xs font-semibold text-orange-500 hover:text-orange-400 transition-colors"
                                    >
                                        Browse all {category.name} →
                                    </Link>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Uncategorised fallback */}
                    {uncategorised.length > 0 && (
                        <div>
                            <div className="mb-4 flex items-center gap-2">
                                <h3 className="text-lg font-bold text-orange-500 dark:text-orange-400">
                                    Other Products
                                </h3>
                                <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                    {uncategorised.length}
                                </span>
                            </div>
                            <div className="mb-6 h-px bg-gradient-to-r from-orange-400 via-orange-200 to-transparent dark:from-orange-600 dark:via-orange-900/40" />
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                                {uncategorised.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* View all CTA */}
            {!isSearching && (
                <div className="mt-12 text-center">
                    <Link
                        href="/products"
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-800 px-8 py-3.5 font-semibold text-blue-800 transition-all duration-200 hover:bg-blue-800 hover:text-white dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white dark:hover:border-blue-600"
                    >
                        View All Products
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            )}
        </div>
    );
}