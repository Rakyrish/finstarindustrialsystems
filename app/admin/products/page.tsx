"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { getAdminProducts, getAdminCategories, deleteAdminProduct, type ApiProduct, type ApiCategory } from "@/lib/api";
import Image from "next/image";
import { ProductForm } from "@/components/admin/ProductForm";
import { useToast } from "@/components/admin/Toast";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ── Icons ──────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
);
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
);
const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
);
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
);

// ── Skeleton ───────────────────────────────────────────────────────────────
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-4 flex flex-col gap-1 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-2xl font-extrabold ${color}`}>{value}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<ApiProduct | undefined>(undefined);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      const [prodsData, catsData] = await Promise.all([
        getAdminProducts(),
        getAdminCategories(),
      ]);
      setProducts(prodsData.results ?? []);
      setCategories(catsData ?? []);
    } catch {
      setError("Failed to load products.");
      addToast("Failed to load products", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // ── Reset page whenever filters change ───────────────────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, featuredFilter, pageSize]);

  // ── Derived / filtered list ──────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "inactive" && p.is_active) return false;
      if (categoryFilter !== "all" && String(p.category?.id) !== categoryFilter) return false;
      if (featuredFilter === "featured" && !p.featured) return false;
      if (q) {
        const haystack = [p.name, p.category?.name ?? ""].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [products, searchQuery, statusFilter, categoryFilter, featuredFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter((p) => p.is_active).length,
    inactive: products.filter((p) => !p.is_active).length,
    featured: products.filter((p) => p.featured).length,
  }), [products]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to deactivate this product?")) return;
    try {
      await deleteAdminProduct(id);
      addToast("Product deactivated successfully", "success");
      fetchData(true);
    } catch {
      addToast("Failed to delete product", "error");
    }
  };

  const handleAddNew = () => { setEditProduct(undefined); setShowForm(true); };
  const handleEdit = (product: ApiProduct) => { setEditProduct(product); setShowForm(true); };
  const handleFormSave = () => { setShowForm(false); setEditProduct(undefined); fetchData(true); };
  const handleFormCancel = () => { setShowForm(false); setEditProduct(undefined); };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setFeaturedFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || categoryFilter !== "all" || featuredFilter !== "all";

  // ── Pagination helpers ───────────────────────────────────────────────────
  function getPageNumbers(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (safePage > 3) pages.push("…");
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) pages.push(p);
    if (safePage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Products</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your inventory and catalog</p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer disabled:opacity-50"
              title="Refresh"
            >
              <span className={refreshing ? "animate-spin" : ""}><RefreshIcon /></span>
            </button>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
            >
              <PlusIcon /> Add Product
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <ProductForm
          categories={categories}
          product={editProduct}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      )}

      {!showForm && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total" value={stats.total} color="text-slate-900 dark:text-white" />
            <StatCard label="Active" value={stats.active} color="text-green-600 dark:text-green-400" />
            <StatCard label="Inactive" value={stats.inactive} color="text-slate-500 dark:text-slate-400" />
            <StatCard label="Featured" value={stats.featured} color="text-orange-500 dark:text-orange-400" />
          </div>

          {/* Filters bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or category…"
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <XIcon />
                </button>
              )}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-700 dark:text-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-700 dark:text-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>

            {/* Featured filter */}
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value as typeof featuredFilter)}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-700 dark:text-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="all">All products</option>
              <option value="featured">Featured only</option>
            </select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-medium transition hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                <XIcon /> Clear
              </button>
            )}
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>
              Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{paginatedProducts.length}</span> of{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredProducts.length}</span> products
              {hasActiveFilters && " (filtered)"}
            </span>
            {/* Page size */}
            <div className="flex items-center gap-2">
              <span className="text-xs">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-700 dark:text-slate-300 px-2 py-1 focus:outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
            {error ? (
              <div className="p-6 text-red-500">{error}</div>
            ) : loading ? (
              <TableSkeleton rows={pageSize} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-white/10">
                    <tr>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Featured</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {paginatedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                              {p.image_url ? (
                                <div className="relative h-full w-full">
                                  <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="40px" />
                                </div>
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs">
                                  No img
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">ID #{p.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-medium">
                            {p.category?.name ?? "None"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {p.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-400/10 px-2.5 py-1 rounded-lg text-xs font-medium">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-400/10 px-2.5 py-1 rounded-lg text-xs font-medium">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {p.featured ? (
                            <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-400/10 px-2.5 py-1 rounded-lg text-xs font-bold">
                              ★ Featured
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(p)}
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                              title="Edit product"
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 transition cursor-pointer"
                              title="Deactivate product"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedProducts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                            <span className="text-3xl">🔍</span>
                            <p className="font-medium">No products found</p>
                            {hasActiveFilters && (
                              <button onClick={clearFilters} className="text-sm text-orange-500 hover:text-orange-600 font-medium mt-1">
                                Clear all filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
              <p className="text-sm text-slate-500 dark:text-slate-400 order-2 sm:order-1">
                Page <span className="font-semibold text-slate-700 dark:text-slate-300">{safePage}</span> of{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{totalPages}</span>
              </p>
              <div className="flex items-center gap-1 order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeftIcon />
                </button>

                {getPageNumbers().map((page, idx) =>
                  page === "…" ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm select-none">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition border ${safePage === page
                          ? "bg-orange-500 border-orange-500 text-white"
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}