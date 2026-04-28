"use client";

import Link from "next/link";

export default function ProductDetailErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
      <div className="mb-4 text-5xl">⚠️</div>
      <h2 className="mb-2 text-2xl font-bold text-slate-900">
        Failed to load product details
      </h2>
      <p className="mb-6 text-slate-500">
        The product detail request did not complete successfully. Try again or
        go back to the product catalog.
      </p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="rounded-xl bg-blue-800 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-900"
        >
          Try Again
        </button>
        <Link
          href="/products"
          className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition-colors hover:border-blue-800 hover:text-blue-800"
        >
          Back to Products
        </Link>
      </div>
    </div>
  );
}
