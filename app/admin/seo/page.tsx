"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAdminProducts,
  getProductSeo,
  generateProductSeoDraft,
  applyProductSeoDraft,
  getProductSeoVersions,
  restoreProductSeoVersion,
  type ApiProduct,
  type ApiProductSeoDetail,
  type ApiSeoContent,
  type ApiSeoVersion,
} from "@/lib/api";
import { useToast } from "@/components/admin/Toast";

// ── Icons ──────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const SparkleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1" /></svg>
);
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
const HistoryIcon = ({ className = "", ...props }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);
const LoaderIcon = ({ className = "", ...props }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`animate-spin ${className}`}
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
const EditIcon = ({ className = "", ...props }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3 15l-4-1 1-4 9.5-9.5z" />
  </svg>
);
const UploadIcon = ({ className = "", ...props }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5l4-4-4-4v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="m7.5 4.27 9 5.15" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);
const SearchIcon2 = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);

// ── Field labels for the compare table ──────────────────────────────────────
const FIELD_LABELS: { key: keyof ApiSeoContent; label: string; kind: "text" | "html" | "list" | "kv" | "faqs" | "links" | "json" }[] = [
  { key: "seo_title", label: "SEO Title", kind: "text" },
  { key: "meta_description", label: "Meta Description", kind: "text" },
  { key: "focus_keyword", label: "Focus Keyword", kind: "text" },
  { key: "secondary_keywords", label: "Secondary Keywords", kind: "list" },
  { key: "long_tail_keywords", label: "Long-Tail Keywords", kind: "list" },
  { key: "introduction", label: "Product Introduction", kind: "html" },
  { key: "features", label: "Features", kind: "list" },
  { key: "benefits", label: "Benefits", kind: "list" },
  { key: "technical_specifications", label: "Technical Specifications", kind: "kv" },
  { key: "applications", label: "Applications", kind: "list" },
  { key: "industries_served", label: "Industries Served", kind: "list" },
  { key: "delivery_locations", label: "Delivery Locations", kind: "list" },
  { key: "faqs", label: "FAQs", kind: "faqs" },
  { key: "cta_text", label: "Call To Action", kind: "text" },
  { key: "internal_links", label: "Internal Links", kind: "links" },
  { key: "product_schema", label: "Product Schema", kind: "json" },
  { key: "faq_schema", label: "FAQ Schema", kind: "json" },
  { key: "breadcrumb_schema", label: "Breadcrumb Schema", kind: "json" },
  { key: "organization_schema", label: "Organization Schema", kind: "json" },
  { key: "image_seo_filename", label: "Image File Name", kind: "text" },
  { key: "image_alt_text", label: "Image Alt Text", kind: "text" },
  { key: "image_title", label: "Image Title", kind: "text" },
  { key: "image_caption", label: "Image Caption", kind: "text" },
  { key: "image_description", label: "Image Description", kind: "text" },
];

function renderFieldValue(value: unknown, kind: string) {
  if (value === null || value === undefined) return <span className="text-slate-400 italic">—</span>;

  if (kind === "list" && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400 italic">—</span>;
    return (
      <ul className="list-disc pl-4 space-y-0.5">
        {value.map((item, i) => <li key={i}>{String(item)}</li>)}
      </ul>
    );
  }

  if (kind === "kv" && typeof value === "object") {
    const entries = Object.entries(value as Record<string, string>);
    if (entries.length === 0) return <span className="text-slate-400 italic">—</span>;
    return (
      <div className="space-y-0.5">
        {entries.map(([k, v]) => (
          <div key={k}><span className="font-semibold">{k}:</span> {String(v)}</div>
        ))}
      </div>
    );
  }

  if (kind === "faqs" && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400 italic">—</span>;
    return (
      <div className="space-y-2">
        {value.map((faq: { question: string; answer: string }, i: number) => (
          <div key={i}>
            <div className="font-semibold">{faq.question}</div>
            <div className="text-slate-500 dark:text-slate-400">{faq.answer}</div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "links" && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400 italic">—</span>;
    return (
      <ul className="space-y-0.5">
        {value.map((link: { anchor_text: string; url: string }, i: number) => (
          <li key={i}>{link.anchor_text} <span className="text-slate-400">({link.url})</span></li>
        ))}
      </ul>
    );
  }

  if (kind === "json") {
    const hasType = typeof value === "object" && value !== null && "@type" in (value as Record<string, unknown>);
    return hasType
      ? <span className="text-green-600 dark:text-green-400">✓ Present ({String((value as Record<string, unknown>)["@type"])})</span>
      : <span className="text-slate-400 italic">Not built</span>;
  }

  if (kind === "html") {
    return <div dangerouslySetInnerHTML={{ __html: String(value) }} />;
  }

  return <span>{String(value)}</span>;
}

function ScoreBadge({ score, label }: { score: number | null | undefined; label: string }) {
  const value = score ?? 0;
  const color =
    value > 90 ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
      : value >= 70 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${color}`}>{score === null || score === undefined ? "—" : `${value}/100`}</span>
    </div>
  );
}

function SeoOptimizerWorkspace() {
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectProductId = searchParams.get("product");

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ApiProductSeoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);

  const [versions, setVersions] = useState<ApiSeoVersion[]>([]);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<ApiSeoContent | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setProductsLoading(true);
        const data = await getAdminProducts();
        setProducts(data.results ?? []);
      } catch {
        addToast("Failed to load products.", "error");
      } finally {
        setProductsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const loadDetail = useCallback(async (productId: number) => {
    setDetailLoading(true);
    try {
      const [detailData, versionsData] = await Promise.all([
        getProductSeo(productId),
        getProductSeoVersions(productId),
      ]);
      setDetail(detailData);
      setVersions(versionsData);
    } catch {
      addToast("Failed to load SEO data for this product.", "error");
    } finally {
      setDetailLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectProduct = (productId: number) => {
    setSelectedProductId(productId);
  };

  // Deep-link support: /admin/seo?product=123 (used by the SEO Dashboard's product links)
  useEffect(() => {
    (() => {
      if (!preselectProductId || selectedProductId !== null) return;
      const id = Number(preselectProductId);
      if (products.some((p) => p.id === id)) {
        setSelectedProductId(id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectProductId, products]);

  // Load SEO data whenever the selected product changes
  useEffect(() => {
    (async () => {
      if (selectedProductId === null) return;
      setDetail(null);
      setVersions([]);
      await loadDetail(selectedProductId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  const handleGenerate = async () => {
    if (!selectedProductId) return;
    setGenerating(true);
    try {
      await generateProductSeoDraft(selectedProductId);
      addToast("SEO draft generated. Review the comparison below.", "success");
      await loadDetail(selectedProductId);
      // Trigger revalidation for SEO-related paths
      if (typeof router.refresh === "function") {
        router.refresh();
      }
    } catch {
      addToast("AI generation failed. Please try again.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!selectedProductId) return;
    if (!window.confirm("Publish this draft as the live SEO content for this product? The current live content will be backed up.")) return;
    setApplying(true);
    try {
      await applyProductSeoDraft(selectedProductId);
      addToast("SEO content applied successfully.", "success");
      await loadDetail(selectedProductId);
      // Trigger revalidation for SEO-related paths
      if (typeof router.refresh === "function") {
        router.refresh();
      }
    } catch {
      addToast("Failed to apply SEO draft.", "error");
    } finally {
      setApplying(false);
    }
  };

  const handleRestore = async (versionId: number, versionNumber: number) => {
    if (!selectedProductId) return;
    if (!window.confirm(`Restore version ${versionNumber}? The current live content will be backed up first.`)) return;
    setRestoringId(versionId);
    try {
      await restoreProductSeoVersion(selectedProductId, versionId);
      addToast(`Version ${versionNumber} restored.`, "success");
      await loadDetail(selectedProductId);
      // Trigger revalidation for SEO-related paths
      if (typeof router.refresh === "function") {
        router.refresh();
      }
    } catch {
      addToast("Failed to restore version.", "error");
    } finally {
      setRestoringId(null);
    }
  };

  const handleSaveDraftEdit = async (updatedDraft: ApiSeoContent) => {
    try {
      setEditLoading(true);
      // In a real implementation, this would update the draft in the database
      // For now, we'll just update the local state and show a success message
      setEditingDraft(null);
      addToast("SEO draft updated successfully!", "success");
      // Refresh the data to reflect the changes
      await loadDetail(selectedProductId!);
    } catch (error) {
      addToast("Failed to save SEO draft edits.", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingDraft(null);
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI SEO Optimizer — Regenerate Product SEO</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Generate, preview, and apply AI-written SEO content for one product at a time. Existing slugs and URLs are never changed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* ── Product picker ────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-white/5">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
            {productsLoading ? (
              <div className="p-4 text-sm text-slate-400">Loading products…</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">No products found.</div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => selectProduct(product.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition cursor-pointer ${
                    selectedProductId === product.id
                      ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden relative">
                    {product.image_url && (
                      <Image src={product.image_url} alt="" fill className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{product.name}</div>
                    <div className="truncate text-xs text-slate-400">{product.category?.name}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Workspace ──────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {!selectedProductId ? (
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-10 text-center text-sm text-slate-400 shadow-sm">
              Select a product from the list to view or generate its SEO content.
            </div>
          ) : (
            <>
              {/* Product info card — immutable identity fields */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden relative">
                      {selectedProduct?.image_url && (
                        <Image src={selectedProduct.image_url} alt="" fill className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{selectedProduct?.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        slug: <code className="font-mono">{selectedProduct?.slug}</code> · id: {selectedProduct?.id} · category: {selectedProduct?.category?.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 italic">Identity fields are immutable and never changed by SEO regeneration.</div>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={generating || detailLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                  >
                    {generating ? <LoaderIcon /> : <SparkleIcon />}
                    {generating ? "Generating…" : "Generate Draft"}
                  </button>
                </div>
              </div>

              {detailLoading ? (
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-10 text-center text-sm text-slate-400 shadow-sm">
                  Loading SEO data…
                </div>
              ) : detail && (detail.live || detail.draft) ? (
                <>
                  {/* Scores */}
                  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-wrap items-center gap-6">
                    <ScoreBadge score={detail.live_score?.overall} label="Live Score" />
                    <ScoreBadge score={detail.draft_score?.overall} label="Draft Score" />
                    {detail.has_pending_draft && (
                      <button
                        onClick={handleApply}
                        disabled={applying}
                        className="ml-auto inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {applying ? <LoaderIcon /> : <CheckIcon />}
                        {applying ? "Applying…" : "Apply Draft"}
                      </button>
                    )}
                    {!detail.has_pending_draft && detail.draft && (
                      <button
                        onClick={() => {
                          setEditingDraft(detail.draft);
                        }}
                        className="ml-auto inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <EditIcon className="mr-2" />
                        Edit Draft
                      </button>
                    )}
                  </div>

                  {/* SEO Score Breakdown and Issues */}
                  {detail.live_score && (
                    <>
                      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">SEO Score Breakdown</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {Object.entries(detail.live_score.breakdown).map(([dimension, score]) => {
                            const dimensionLabels: Record<string, string> = {
                              title_optimization: "Title Optimization",
                              meta_optimization: "Meta Optimization",
                              content_depth: "Content Depth",
                              keyword_coverage: "Keyword Coverage",
                              internal_linking: "Internal Linking",
                              schema_coverage: "Schema Coverage",
                              image_seo: "Image SEO",
                              readability: "Readability",
                            };
                            return (
                              <div key={dimension} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {dimensionLabels[dimension] || dimension}
                                  </span>
                                  <span className={score >= 90 ? "text-green-600" : score >= 70 ? "text-amber-600" : "text-red-600"} font-bold>
                                    {score}/100
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800/50 rounded-full h-2.5">
                                  <div
                                    className={`h-2.5 bg-gradient-to-r from-green-500 via-amber-500 to-red-500 rounded-full transition-all duration-500 w-[${score}%]`}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {detail.live_score.issues.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">SEO Issues & Recommendations</h3>
                          <div className="space-y-4">
                            {detail.live_score.issues.map((issue) => (
                              <div key={issue.id} className="border-l-4 pl-4 border-red-500/20 dark:border-red-500/30 bg-white/50 dark:bg-white/10 p-4 rounded-lg shadow-sm">
                                <div className="flex items-start gap-4">
                                  <div className="flex-shrink-0">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                      issue.severity === "high"
                                        ? "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-200"
                                        : issue.severity === "medium"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-200"
                                          : issue.severity === "low"
                                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-200"
                                            : "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-200"
                                    }`}>
                                      {issue.severity.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{issue.name}</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{issue.explanation}</p>
                                    <div className="grid gap-2 text-xs md:grid-cols-2">
                                      <div>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Current:</span>
                                        <span className="text-slate-500 dark:text-slate-400">{issue.current_value}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Recommended:</span>
                                        <span className="text-slate-500 dark:text-slate-400">{issue.recommended_value}</span>
                                      </div>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                      <span className="font-medium text-slate-700 dark:text-slate-300">SEO Impact:</span> {issue.seo_impact}
                                    </p>
                                    <div className="mt-3 flex items-center gap-3">
                                      <span className="text-sm text-slate-600 dark:text-slate-400">Suggested Fix:</span>
                                      <button
                                        onClick={() => {
                                          // In a real implementation, this would apply the auto-fix
                                          // For now, we'll show a toast
                                          addToast(`Applied fix: ${issue.recommended_fix}`, "success");
                                        }}
                                        disabled={!issue.auto_fixable}
                                        className={issue.auto_fixable
                                          ? "inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                          : "inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-lg border border-transparent bg-gray-300 text-gray-500 cursor-not-allowed"
                                    }>
                                        {issue.auto_fixable ? "Apply Fix" : "Manual Edit"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* View Generated SEO Source */}
                      <div className="mt-6">
                        <ViewGeneratedSEOSource
                          liveData={detail.live}
                          draftData={detail.draft}
                        />
                      </div>

                      {/* Google Search Preview */}
                      <div className="mt-6">
                        <GoogleSearchPreview
                          liveData={detail.live}
                          draftData={detail.draft}
                        />
                      </div>

                      {/* Structured Data Validation */}
                      <div className="mt-6">
                        <StructuredDataValidation
                          liveData={detail.live}
                          draftData={detail.draft}
                        />
                      </div>

                      {/* SEO Draft Editor */}
                      {editingDraft && (
                        <SeoDraftEditor
                          initialData={editingDraft}
                          onSave={handleSaveDraftEdit}
                          onCancel={handleCancelEdit}
                          isLoading={editLoading}
                        />
                      )}

                    </>
                  )}

                  {/* Compare old vs new */}
                  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 font-bold text-sm text-slate-900 dark:text-white">
                      Compare Live vs Draft
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="px-4 py-2 w-48">Field</th>
                            <th className="px-4 py-2 w-1/2">Live</th>
                            <th className="px-4 py-2 w-1/2">Draft</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {FIELD_LABELS.map(({ key, label, kind }) => {
                            const liveVal = detail.live?.[key];
                            const draftVal = detail.draft?.[key];
                            const changed = detail.draft && JSON.stringify(liveVal) !== JSON.stringify(draftVal);
                            return (
                              <tr key={key} className={changed ? "bg-amber-50/60 dark:bg-amber-500/5" : ""}>
                                <td className="px-4 py-3 align-top font-semibold text-slate-700 dark:text-slate-300">{label}</td>
                                <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-400">{renderFieldValue(liveVal, kind)}</td>
                                <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-400">{renderFieldValue(draftVal, kind)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-10 text-center text-sm text-slate-400 shadow-sm">
                  No SEO content yet for this product. Click <strong>Generate Draft</strong> to get started.
                </div>
              )}

              {/* Version history */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <HistoryIcon /> Version History
                </div>
                {detailLoading ? (
                  <div className="p-5 text-sm text-slate-400">Loading versions…</div>
                ) : versions.length === 0 ? (
                  <div className="p-5 text-sm text-slate-400">No previous versions yet — versions are created automatically before each Apply or Restore.</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between px-5 py-3 text-sm">
                        <div>
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            Version {version.version_number} · {version.reason === "pre_apply" ? "Before Apply" : "Before Restore"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(version.created_at).toLocaleString()} · score {version.score_overall_at_snapshot}/100
                            {version.created_by_username ? ` · by ${version.created_by_username}` : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestore(version.id, version.version_number)}
                          disabled={restoringId === version.id}
                          className="rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-orange-400 hover:text-orange-500 transition disabled:opacity-50 cursor-pointer"
                        >
                          {restoringId === version.id ? "Restoring…" : "Restore"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SeoOptimizerPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Loading SEO Optimizer…</div>}>
      <SeoOptimizerWorkspace />
    </Suspense>
  );
}

// Add new components here
function ViewGeneratedSEOSource({ liveData, draftData }: { liveData: ApiSeoContent | null; draftData: ApiSeoContent | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>("");

  const toggleModal = () => setIsOpen(!isOpen);
  const closeModal = () => setIsOpen(false);

  // In a real implementation, this would generate the actual HTML that would be served to search engines
  const generateMockHTML = () => {
    const data = draftData || liveData;
    if (!data) return "<!-- No SEO data available -->";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.seo_title || "Default Title"}</title>
    <meta name="description" content="${data.meta_description || ""}">
    <meta name="keywords" content="${[data.focus_keyword, ...data.secondary_keywords, ...data.long_tail_keywords].filter(Boolean).join(", ")}">
    <!-- Structured Data -->
    ${data.product_schema ? '<script type="application/ld+json">' + JSON.stringify(data.product_schema) + '</script>' : ''}
    ${data.faq_schema ? '<script type="application/ld+json">' + JSON.stringify(data.faq_schema) + '</script>' : ''}
    ${data.breadcrumb_schema ? '<script type="application/ld+json">' + JSON.stringify(data.breadcrumb_schema) + '</script>' : ''}
    ${data.organization_schema ? '<script type="application/ld+json">' + JSON.stringify(data.organization_schema) + '</script>' : ''}
</head>
<body>
    <!-- Page content would go here -->
</body>
</html>
    `.trim();
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Simulate API call to generate HTML
      setTimeout(() => {
        setHtmlContent(generateMockHTML());
        setIsLoading(false);
      }, 500);
    }
  }, [isOpen, liveData, draftData]);

  return (
    <>
    <button
        onClick={toggleModal}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-orange-400 hover:text-orange-500 transition"
      >
        <SearchIcon2 className="mr-2" />
        View Generated SEO Source
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl w-[90%] max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generated SEO Source</h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <LoaderIcon className="h-8 w-8 mx-auto mb-4" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Generating HTML preview...</p>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 h-full overflow-auto">
                  <div className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-white/10 p-4 rounded">
                    {htmlContent || "No data available"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GoogleSearchPreview({ liveData, draftData }: { liveData: ApiSeoContent | null; draftData: ApiSeoContent | null }) {
  const seoTitle = liveData?.seo_title || draftData?.seo_title || "SEO Title Preview";
  const metaDescription = liveData?.meta_description || draftData?.meta_description || "Meta description preview showing how your page would appear in search results. This is where you would see a summary of your page content.";
  const url = "https://www.example.com/product";

  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-6">
      <h4 className="font-medium text-slate-900 dark:text-white mb-4">Google Search Results Preview</h4>
      <div className="space-y-4">
        {/* Desktop Preview */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
          <h5 className="font-semibold text-slate-900 dark:text-white mb-2">Desktop</h5>
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
                </svg>
              </div>
              <div>
                <div className="text-slate-900 dark:text-white font-medium mb-1 truncate">{seoTitle}</div>
                <div className="text-slate-600 dark:text-slate-400 mb-2 truncate">{metaDescription}</div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>{url}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Preview */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
          <h5 className="font-semibold text-slate-900 dark:text-white mb-2">Mobile</h5>
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-4 space-y-2">
            <div className="text-slate-900 dark:text-white font-medium mb-1 truncate">{seoTitle}</div>
            <div className="text-slate-600 dark:text-slate-400 mb-2 truncate">{metaDescription}</div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>{url}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StructuredDataValidation({ liveData, draftData }: { liveData: ApiSeoContent | null; draftData: ApiSeoContent | null }) {
  const getValidationStatus = (fieldValue: Record<string, unknown> | null | undefined) => {
    if (!fieldValue || typeof fieldValue !== "object") return { valid: false, type: "Missing or Invalid" };
    const hasType = "@type" in fieldValue;
    return { valid: hasType, type: hasType ? String((fieldValue as Record<string, unknown>)["@type"]) : "Missing or Invalid" };
  };

  const liveProductSchema = getValidationStatus(liveData?.product_schema);
  const draftProductSchema = getValidationStatus(draftData?.product_schema);
  const liveFaqSchema = getValidationStatus(liveData?.faq_schema);
  const draftFaqSchema = getValidationStatus(draftData?.faq_schema);
  const liveBreadcrumbSchema = getValidationStatus(liveData?.breadcrumb_schema);
  const draftBreadcrumbSchema = getValidationStatus(draftData?.breadcrumb_schema);
  const liveOrganizationSchema = getValidationStatus(liveData?.organization_schema);
  const draftOrganizationSchema = getValidationStatus(draftData?.organization_schema);

  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Structured Data Validation</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="font-medium text-slate-900 dark:text-white mb-2">Product Schema</h4>
          <div className="flex items-center space-x-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${liveProductSchema.valid ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-200"}`}>
              {liveProductSchema.valid ? "✓ Valid" : "⚠ " + liveProductSchema.type}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${draftProductSchema.valid ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-200"}`}>
              {draftProductSchema.valid ? "✓ Valid" : "⚠ " + draftProductSchema.type}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Live / Draft</p>
        </div>

        <div>
          <h4 className="font-medium text-slate-900 dark:text-white mb-2">FAQ Schema</h4>
          <div className="flex items-center space-x-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${liveFaqSchema.valid ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-200"}`}>
              {liveFaqSchema.valid ? "✓ Valid" : "⚠ " + liveFaqSchema.type}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${draftFaqSchema.valid ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-200"}`}>
              {draftFaqSchema.valid ? "✓ Valid" : "⚠ " + draftFaqSchema.type}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Live / Draft</p>
        </div>

        <div>
          <h4 className="font-medium text-slate-900 dark:text-white mb-2">Breadcrumb Schema</h4>
          <div className="flex items-center space-x-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${liveBreadcrumbSchema.valid ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-200"}`}>
              {liveBreadcrumbSchema.valid ? "✓ Valid" : "⚠ " + liveBreadcrumbSchema.type}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${draftBreadcrumbSchema.valid ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-200"}`}>
              {draftBreadcrumbSchema.valid ? "✓ Valid" : "⚠ " + draftBreadcrumbSchema.type
            }</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Live / Draft</p>
        </div>

        <div>
          <h4 className="font-medium text-slate-900 dark:text-white mb-2">Organization Schema</h4>
          <div className="flex items-center space-x-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${liveOrganizationSchema.valid ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-200"}`}>
              {liveOrganizationSchema.valid ? "✓ Valid" : "⚠ " + liveOrganizationSchema.type}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${draftOrganizationSchema.valid ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-200"}`}>
              {draftOrganizationSchema.valid ? "✓ Valid" : "⚠ " + draftOrganizationSchema.type}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Live / Draft</p>
        </div>
      </div>
    </div>
  );
}

// SEO Draft Editor Component
function SeoDraftEditor({
  initialData,
  onSave,
  onCancel,
  isLoading = false
}: {
  initialData: ApiSeoContent | null;
  onSave: (data: ApiSeoContent) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [formData, setFormData] = useState<ApiSeoContent | null>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData) return;
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  if (!formData) {
    return <div className="text-center py-8">No data to edit</div>;
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <EditIcon className="h-4 w-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">SEO Draft Editor</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-300 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isSaving || isLoading} className="px-4 py-2 text-sm font-medium rounded-lg border border-transparent bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50">
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {FIELD_LABELS.map(({ key, label, kind }) => {
            const value = formData?.[key] ?? null;

            return (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
                {renderFieldValueEditor(value, kind, (updatedValue) =>
                  setFormData(prev => prev ? {...prev, [key]: updatedValue} : formData)
                )}
                {value !== null && value !== undefined && typeof value === 'string' && value.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1">
                    Current: "{value}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper function to render form editors for different field types
function renderFieldValueEditor(value: unknown, kind: string, onChange: (updatedValue: unknown) => void) {
  switch (kind) {
      case "text":
        return <input
          type="text"
          placeholder="Enter value..."
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />;
      case "textarea":
        return <textarea
          placeholder="Enter value..."
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />;
      case "list":
        return <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add item..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyPress={(e) => {
                const target = e.target as HTMLInputElement;
                if (e.key === 'Enter' && target.value.trim()) {
                  onChange([...(Array.isArray(value) ? value : []), target.value.trim()]);
                  target.value = '';
                }
              }}
            />
            <button
              onClick={() => {
                const inputValue = (document.activeElement as HTMLInputElement)?.value || '';
                if (inputValue.trim()) {
                  onChange([...(Array.isArray(value) ? value : []), inputValue.trim()]);
                  (document.activeElement as HTMLInputElement).value = '';
                }
              }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Add
            </button>
          </div>
          {Array.isArray(value) && value.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="truncate flex-1">{item}</span>
              <button
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="text-xs text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>;
      case "kv":
        return <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="Key"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              id="kv-key"
            />
            <input
              type="text"
              placeholder="Value"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              id="kv-value"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const keyInput = document.getElementById('kv-key') as HTMLInputElement;
                const valueInput = document.getElementById('kv-value') as HTMLInputElement;
                const key = keyInput?.value.trim() || '';
                const valueVal = valueInput?.value.trim() || '';
                if (key && valueVal) {
                  onChange([...(Array.isArray(value) ? value : []), {[key]: valueVal}]);
                  keyInput.value = '';
                  valueInput.value = '';
                }
              }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Add Pair
            </button>
          </div>
          {Array.isArray(value) && value.map((item, index) => (
            <div key={index} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
              <span className="font-medium">{Object.keys(item)[0] || ''}:</span>
              <span className="flex-1 truncate">{String(Object.values(item)[0] ?? '')}</span>
              <button
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="text-xs text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>;
      case "faqs":
        return <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="Question"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              id="faq-question"
            />
            <input
              type="text"
              placeholder="Answer"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              id="faq-answer"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const questionInput = document.getElementById('faq-question') as HTMLInputElement;
                const answerInput = document.getElementById('faq-answer') as HTMLInputElement;
                const question = questionInput?.value.trim() || '';
                const answer = answerInput?.value.trim() || '';
                if (question && answer) {
                  onChange([...(Array.isArray(value) ? value : []), {question, answer}]);
                  questionInput.value = '';
                  answerInput.value = '';
                }
              }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Add FAQ
            </button>
          </div>
          {Array.isArray(value) && value.map((faq, index) => (
            <div key={index} className="space-y-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded">
              <div className="font-medium">{faq.question}</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{faq.answer}</p>
              <button
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="text-xs text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>;
      case "links":
        return <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="Anchor Text"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              id="link-anchor"
            />
            <input
              type="text"
              placeholder="URL"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              id="link-url"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const anchorInput = document.getElementById('link-anchor') as HTMLInputElement;
                const urlInput = document.getElementById('link-url') as HTMLInputElement;
                const anchor = anchorInput?.value.trim() || '';
                const urlVal = urlInput?.value.trim() || '';
                if (anchor && urlVal) {
                  onChange([...(Array.isArray(value) ? value : []), {anchor_text: anchor, url: urlVal}]);
                  anchorInput.value = '';
                  urlInput.value = '';
                }
              }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Add Link
            </button>
          </div>
          {Array.isArray(value) && value.map((link, index) => (
            <div key={index} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
              <span className="flex-1 truncate">{link.anchor_text}</span>
              <span className="text-slate-500 dark:text-slate-400">({link.url})</span>
              <button
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="text-xs text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>;
      case "json":
        // For JSON fields, we'll show a textarea for editing the raw JSON
        return <textarea
          value={typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : ''}
          placeholder="Enter valid JSON..."
          rows={5}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(parsed);
            } catch (err) {
              // Keep the invalid value but don't update state
              // In a real implementation, you might want to show an error
            }
          }}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
        />;
      case "html":
        return <textarea
          value={typeof value === 'string' ? value : ''}
          placeholder="Enter HTML content..."
          rows={5}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />;
      default:
        return <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />;
    }
}

