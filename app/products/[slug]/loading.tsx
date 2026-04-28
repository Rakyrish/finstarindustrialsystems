export default function ProductDetailLoadingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="aspect-square animate-pulse rounded-3xl bg-slate-200 lg:min-h-[400px]" />
        <div className="space-y-4">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
          <div className="mt-8 rounded-2xl bg-slate-50 p-5">
            <div className="mb-3 h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-4 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
