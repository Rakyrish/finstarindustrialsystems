"use client";

export default function ProductsErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
      <div className="mb-4 text-5xl">⚠️</div>
      <h2 className="mb-2 text-2xl font-bold text-slate-900">
        Failed to load products
      </h2>
      <p className="mb-6 text-slate-500">
        The product catalog could not be loaded from the API. Try again, or
        return later once the backend connection is available.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-blue-800 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-900"
      >
        Try Again
      </button>
    </div>
  );
}
