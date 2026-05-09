"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useDeferredValue, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types";
import { navigationCategories } from "@/lib/data";
import { buildCategoryPath } from "@/lib/seo";

interface GlobalSearchProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
}

const MAX_RESULTS = 8;
const MAX_CATEGORY_RESULTS = 4;

export default function GlobalSearch({ products, isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setActiveIndex(-1);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const matchedProducts = normalizedQuery.length < 2
    ? []
    : products
        .filter((p) =>
          p.name.toLowerCase().includes(normalizedQuery) ||
          (p.shortDescription || "").toLowerCase().includes(normalizedQuery) ||
          p.description.toLowerCase().includes(normalizedQuery) ||
          p.category.name.toLowerCase().includes(normalizedQuery) ||
          Object.values(p.specs ?? {}).some((v) =>
            String(v).toLowerCase().includes(normalizedQuery)
          )
        )
        .slice(0, MAX_RESULTS);

  const matchedCategories = normalizedQuery.length < 2
    ? []
    : navigationCategories
        .filter((c) =>
          c.name.toLowerCase().includes(normalizedQuery) ||
          c.description.toLowerCase().includes(normalizedQuery)
        )
        .slice(0, MAX_CATEGORY_RESULTS);

  const totalResults = matchedProducts.length + matchedCategories.length;
  const allItems = [
    ...matchedProducts.map((p) => ({ type: "product" as const, item: p })),
    ...matchedCategories.map((c) => ({ type: "category" as const, item: c })),
  ];

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, totalResults - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const active = allItems[activeIndex];
      if (!active) return;
      onClose();
      if (active.type === "product") {
        router.push(`/products/${active.item.slug}`);
      } else {
        router.push(buildCategoryPath(active.item.slug));
      }
    }
  }, [activeIndex, allItems, onClose, router, totalResults]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Product search"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl search-modal-panel">
        {/* Search input */}
        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
            onKeyDown={handleKeyDown}
            placeholder="Search products, categories, equipment…"
            className="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none dark:text-white"
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              aria-label="Clear search"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
            aria-label="Close search"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        {normalizedQuery.length >= 2 && (
          <div className="mt-2 rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[60vh] overflow-y-auto">
            {totalResults === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  No results for &ldquo;{deferredQuery}&rdquo;
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Try a different keyword or browse by category.
                </p>
                <Link
                  href="/products"
                  onClick={onClose}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Browse all products
                </Link>
              </div>
            ) : (
              <div>
                {/* Products */}
                {matchedProducts.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                        Products ({matchedProducts.length})
                      </p>
                    </div>
                    {matchedProducts.map((product, idx) => {
                      const isActive = idx === activeIndex;
                      const imgSrc = product.imageUrls[0] || product.imageUrl;
                      return (
                        <Link
                          key={product.id}
                          href={`/products/${product.slug}`}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                            isActive
                              ? "bg-orange-50 dark:bg-orange-500/10"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          {imgSrc ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                              <Image src={imgSrc} alt={product.name} fill sizes="40px" className="object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-xl">
                              {product.category.icon}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {product.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {product.category.name}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-slate-400">→</span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Categories */}
                {matchedCategories.length > 0 && (
                  <div className={matchedProducts.length > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""}>
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                        Categories
                      </p>
                    </div>
                    {matchedCategories.map((cat, idx) => {
                      const globalIdx = matchedProducts.length + idx;
                      const isActive = globalIdx === activeIndex;
                      return (
                        <Link
                          key={cat.slug}
                          href={buildCategoryPath(cat.slug)}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                            isActive
                              ? "bg-orange-50 dark:bg-orange-500/10"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-xl">
                            {cat.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {cat.name}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {cat.description}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs text-slate-500">
                            Category
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* View all results link */}
                <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
                  <Link
                    href={`/search?q=${encodeURIComponent(deferredQuery)}`}
                    onClick={onClose}
                    className="flex items-center justify-between text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  >
                    <span>View all results for &ldquo;{deferredQuery}&rdquo;</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Default state — no query */}
        {normalizedQuery.length < 2 && (
          <div className="mt-2 rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
              Popular Categories
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {navigationCategories.slice(0, 6).map((cat) => (
                <Link
                  key={cat.slug}
                  href={buildCategoryPath(cat.slug)}
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
