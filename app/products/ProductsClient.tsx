"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import ProductCard from "@/components/ProductCard";
import type { Category, Product } from "@/types";

const INITIAL_VISIBLE_COUNT = 8;
const LOAD_MORE_COUNT = 6;

interface ProductsClientProps {
  initialProducts: Product[];
  categories: Category[];
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function ProductsClient({
  initialProducts,
  categories,
}: ProductsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setSelectedCategory(searchParams.get("category") ?? "all");
    setSearchQuery(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setIsMobileCategoryOpen(false);
  }, [selectedCategory]);

  const categoryCounts = useMemo(() => {
    return initialProducts.reduce<Record<string, number>>((counts, product) => {
      counts[product.category.slug] = (counts[product.category.slug] ?? 0) + 1;
      return counts;
    }, {});
  }, [initialProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = deferredSearchQuery.trim().toLowerCase();

    return initialProducts.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" || product.category.slug === selectedCategory;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.shortDescription.toLowerCase().includes(normalizedSearch) ||
        product.description.toLowerCase().includes(normalizedSearch) ||
        product.category.name.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [deferredSearchQuery, initialProducts, selectedCategory]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;
  const hasActiveFilters = selectedCategory !== "all" || searchQuery.trim().length > 0;
  const activeCategoryLabel = selectedCategory === "all"
    ? "All Products"
    : categories.find((category) => category.slug === selectedCategory)?.name ?? "Category";

  function syncUrl(nextCategory: string, nextSearch: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedSearch = nextSearch.trim();

    if (nextCategory === "all") {
      params.delete("category");
    } else {
      params.set("category", nextCategory);
    }

    if (trimmedSearch.length === 0) {
      params.delete("search");
    } else {
      params.set("search", trimmedSearch);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    if (value.trim()) {
      setIsMobileCategoryOpen(false);
    }
    syncUrl(selectedCategory, value);
  }

  function applyCategory(slug: string) {
    setSelectedCategory(slug);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    syncUrl(slug, searchQuery);
  }

  function clearFilters() {
    setSelectedCategory("all");
    setSearchQuery("");
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    setIsMobileCategoryOpen(false);
    syncUrl("all", "");
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-1 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="space-y-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <XIcon />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileCategoryOpen((open) => !open)}
              className="flex flex-1 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <span>{activeCategoryLabel}</span>
              <svg
                className={`h-4 w-4 transition-transform ${isMobileCategoryOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
              >
                Clear Filters
              </button>
            )}
          </div>

          {isMobileCategoryOpen && (
            <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <button
                onClick={() => applyCategory("all")}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${selectedCategory === "all"
                  ? "bg-blue-800 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
              >
                <span>All Products</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${selectedCategory === "all"
                  ? "bg-blue-700 text-blue-100"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                  {initialProducts.length}
                </span>
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => applyCategory(category.slug)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${selectedCategory === category.slug
                    ? "bg-blue-800 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                >
                  <span className="truncate">{category.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${selectedCategory === category.slug
                    ? "bg-blue-700 text-blue-100"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                    {categoryCounts[category.slug] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="hidden w-72 shrink-0 space-y-6 lg:block">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-300">
            Search Products
          </h2>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <XIcon />
              </button>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-300">
            Categories
          </h2>
          <div className="space-y-1">
            <button
              onClick={() => applyCategory("all")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${selectedCategory === "all"
                ? "bg-blue-800 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
            >
              <span>All Products</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${selectedCategory === "all"
                ? "bg-blue-700 text-blue-100"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}>
                {initialProducts.length}
              </span>
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => applyCategory(category.slug)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${selectedCategory === category.slug
                  ? "bg-blue-800 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
              >
                <span className="truncate">{category.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${selectedCategory === category.slug
                  ? "bg-blue-700 text-blue-100"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                  {categoryCounts[category.slug] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{visibleProducts.length}</span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{filteredProducts.length}</span>{" "}
            products
          </p>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="hidden text-sm font-semibold text-blue-700 transition hover:text-blue-900 lg:inline-flex dark:text-blue-400 dark:hover:text-blue-200"
            >
              Clear filters
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Try a different keyword or clear your current filters."
            icon="🔍"
            action={{ label: "Clear Filters", onClick: clearFilters }}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => setVisibleCount((count) => count + LOAD_MORE_COUNT)}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-blue-800 px-7 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-800 hover:text-white dark:border-blue-500 dark:text-blue-400 dark:hover:border-blue-500 dark:hover:bg-blue-500 dark:hover:text-white"
                >
                  Load More
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
