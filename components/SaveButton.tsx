"use client";

import { useSavedProducts } from "@/lib/useSavedProducts";
import type { Product } from "@/types";

interface SaveButtonProps {
  product: Product;
  variant?: "card" | "page";
}

export default function SaveButton({ product, variant = "card" }: SaveButtonProps) {
  const { isProductSaved, toggleProduct, mounted } = useSavedProducts();

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return variant === "card" ? (
      <div className="h-8 w-8 rounded-full" />
    ) : null;
  }

  const saved = isProductSaved(product.id);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleProduct({
      id: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.imageUrl || product.imageUrls[0] || "",
      categoryName: product.category.name,
      categorySlug: product.category.slug,
    });
  }

  if (variant === "card") {
    return (
      <button
        onClick={handleClick}
        aria-label={saved ? "Remove from saved products" : "Save product"}
        aria-pressed={saved}
        title={saved ? "Remove from saved" : "Save product"}
        className={`flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all duration-200 hover:scale-110 active:scale-95 ${
          saved
            ? "bg-orange-500 text-white"
            : "bg-white/90 text-slate-400 hover:bg-orange-50 hover:text-orange-500 dark:bg-slate-900/90 dark:text-slate-500 dark:hover:text-orange-400"
        }`}
      >
        <BookmarkIcon filled={saved} />
      </button>
    );
  }

  // Page variant — larger, labelled button
  return (
    <button
      onClick={handleClick}
      aria-label={saved ? "Remove from saved products" : "Save this product"}
      aria-pressed={saved}
      className={`inline-flex items-center gap-2 rounded-xl border-2 px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
        saved
          ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
          : "border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      }`}
    >
      <BookmarkIcon filled={saved} />
      {saved ? "Saved" : "Save Product"}
    </button>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}
