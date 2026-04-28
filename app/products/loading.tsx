import ProductCardSkeleton from "@/components/ProductCardSkeleton";

export default function ProductsLoadingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 lg:w-64">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-3 h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          </div>
        </aside>
        <div className="flex-1">
          <div className="mb-6 h-5 w-56 animate-pulse rounded bg-slate-200" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
