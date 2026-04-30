"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import ProductCard from "@/components/ProductCard";
import { Category, Product } from "@/types";

const INITIAL_VISIBLE_COUNT = 9;
const LOAD_MORE_COUNT = 6;

interface ProductsClientProps {
  initialProducts: Product[];
  categories: Category[];
}

export default function ProductsClient({
  initialProducts,
  categories,
}: ProductsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Close category drawer when a category is selected on mobile
  useEffect(() => {
    setIsMobileCategoryOpen(false);
  }, [selectedCategory]);

  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    const searchFromUrl = searchParams.get("search");
    const timer = setTimeout(() => {
      setSelectedCategory(categoryFromUrl ?? "all");
      if (searchFromUrl) setSearchQuery(searchFromUrl);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
      const matchesCategory =
        selectedCategory === "all" || product.category.slug === selectedCategory;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.shortDescription.toLowerCase().includes(normalizedSearch) ||
        product.category.name.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [deferredSearchQuery, initialProducts, selectedCategory]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;
  const isFiltering = selectedCategory !== "all" || searchQuery.trim().length > 0;

  function syncCategory(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === "all") {
      params.delete("category");
    } else {
      params.set("category", slug);
    }
    startTransition(() => {
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false },
      );
    });
  }

  function applyCategory(slug: string) {
    setSelectedCategory(slug);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    syncCategory(slug);
  }

  function clearFilters() {
    setSelectedCategory("all");
    setSearchQuery("");
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    syncCategory("all");
  }

  const activeCategoryLabel =
    selectedCategory === "all"
      ? "All Products"
      : categories.find((c) => c.slug === selectedCategory)?.name ?? "Category";

  const activeCategoryIcon =
    selectedCategory === "all"
      ? "🛍️"
      : categories.find((c) => c.slug === selectedCategory)?.icon ?? "";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ── MOBILE: sticky top bar ── */}
      <div className="lg:hidden sticky top-0 z-20 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 px-1 py-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(INITIAL_VISIBLE_COUNT);
              // Auto-collapse categories when user starts typing
              if (e.target.value.trim().length > 0) setIsMobileCategoryOpen(false);
            }}
            placeholder="Search products..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 pr-10 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <svg className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category toggle button row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileCategoryOpen((prev) => !prev)}
            className="flex flex-1 items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-blue-700 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
              <span>
                {activeCategoryLabel}
              </span>
            </span>
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${isMobileCategoryOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isFiltering && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>

        {/* Collapsible category list */}
        {isMobileCategoryOpen && (
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-lg space-y-1">
            <button
              onClick={() => applyCategory("all")}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${selectedCategory === "all"
                ? "bg-blue-800 text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
            >
              <span>🛍️ All Products</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${selectedCategory === "all" ? "bg-blue-700 text-blue-200" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                {initialProducts.length}
              </span>
            </button>
            {categories.map((category) => {
              const count = initialProducts.filter((p) => p.category.slug === category.slug).length;
              return (
                <button
                  key={category.id}
                  onClick={() => applyCategory(category.slug)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${selectedCategory === category.slug
                    ? "bg-blue-800 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                  <span className="whitespace-nowrap">{category.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${selectedCategory === category.slug ? "bg-blue-700 text-blue-200" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── DESKTOP: sidebar ── */}
      <aside className="hidden lg:block w-64 shrink-0 space-y-6">
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Search Products
          </h2>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }}
              placeholder="Search products..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 pr-4 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <svg className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Categories
          </h2>
          <div className="space-y-1">
            <button
              onClick={() => applyCategory("all")}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${selectedCategory === "all"
                ? "bg-blue-800 text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
            >
              <span>🛍️ All Products</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${selectedCategory === "all" ? "bg-blue-700 text-blue-200" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                {initialProducts.length}
              </span>
            </button>
            {categories.map((category) => {
              const count = initialProducts.filter((p) => p.category.slug === category.slug).length;
              return (
                <button
                  key={category.id}
                  onClick={() => applyCategory(category.slug)}
                  className={`flex w-full whitespace-nowrap items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${selectedCategory === category.slug
                    ? "bg-blue-800 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                  <span>{category.icon} {category.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${selectedCategory === category.slug ? "bg-blue-700 text-blue-200" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ── Products grid ── */}
      <div className="min-w-0 flex-1">
        {/* Results bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{visibleProducts.length}</span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{filteredProducts.length}</span>{" "}
            products
            {selectedCategory !== "all" && (
              <>
                {" in "}
                <span className="font-semibold text-blue-800 dark:text-blue-400">
                  {categories.find((c) => c.slug === selectedCategory)?.name}
                </span>
              </>
            )}
          </p>

          {/* Desktop clear filters */}
          {isFiltering && (
            <button
              onClick={clearFilters}
              className="hidden lg:flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-400 hover:text-blue-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Try adjusting your search term or clearing the category filter."
            icon="🔍"
            action={{ label: "Clear Filters", onClick: clearFilters }}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => setVisibleCount((c) => c + LOAD_MORE_COUNT)}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-800 dark:border-blue-500 px-8 py-3.5 font-semibold text-blue-800 dark:text-blue-400 transition-all duration-200 hover:bg-blue-800 hover:text-white dark:hover:bg-blue-600 dark:hover:border-blue-600 dark:hover:text-white"
                >
                  Load More
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}