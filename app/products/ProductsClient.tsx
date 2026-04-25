"use client";

import { useState, useMemo } from "react";
import { products, categories } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import EmptyState from "@/components/EmptyState";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function ProductsClient() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(9);

  // Sync category from URL query param
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 space-y-6">
        {/* Search */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
            Search Products
          </h2>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(9);
              }}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400 text-slate-900"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Categories Filter */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
            Categories
          </h2>
          <div className="space-y-1">
            <button
              onClick={() => {
                setSelectedCategory("all");
                setVisibleCount(9);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === "all"
                  ? "bg-blue-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🛍️ All Products</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategory === "all" ? "bg-blue-700 text-blue-200" : "bg-slate-100 text-slate-500"}`}>
                {products.length}
              </span>
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.category === cat.slug).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.slug);
                    setVisibleCount(9);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat.slug
                      ? "bg-blue-800 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{cat.icon} {cat.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategory === cat.slug ? "bg-blue-700 text-blue-200" : "bg-slate-100 text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Products Grid */}
      <div className="flex-1 min-w-0">
        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-500 text-sm">
            Showing <span className="font-semibold text-slate-900">{visible.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{filtered.length}</span> products
            {selectedCategory !== "all" && (
              <>
                {" in "}
                <span className="font-semibold text-blue-800">
                  {categories.find((c) => c.slug === selectedCategory)?.name}
                </span>
              </>
            )}
          </p>
          {(selectedCategory !== "all" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
                setVisibleCount(9);
              }}
              className="text-sm text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Try adjusting your search term or clearing the category filter."
            icon="🔍"
            action={{ label: "Clear Filters", onClick: () => { setSelectedCategory("all"); setSearchQuery(""); } }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => setVisibleCount((c) => c + 6)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-blue-800 text-blue-800 font-semibold rounded-xl hover:bg-blue-800 hover:text-white transition-all duration-200"
                >
                  Load More
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
