// "use client"
import Image from "next/image";
import Link from "next/link";
import { getCategoryIcon } from "@/lib/data";
import { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

const categoryColors: Record<string, string> = {
  refrigeration: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  hvac: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200",
  boilers: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  "cold-rooms": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200",
  fittings: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default function ProductCard({ product }: ProductCardProps) {
  const categoryIcon = getCategoryIcon(product.category.slug, product.category.icon);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:hover:shadow-slate-900/50">

        {/* ↓ h-36 on mobile, taller on larger screens */}
        <div className="relative h-36 sm:h-48 md:h-56 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
          {product.imageUrl ? (
            <>
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1.5 rounded-md bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 backdrop-blur-sm">
                <Image
                  src="/logo.png"
                  alt="Finstar Logo"
                  width={50}
                  height={50}
                  className="h-7 w-7 sm:h-10 sm:w-10 object-contain opacity-90"
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="select-none text-5xl sm:text-7xl opacity-30">{categoryIcon}</span>
            </div>
          )}

          <div className="absolute top-2 left-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold ${categoryColors[product.category.slug] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
              {product.category.name}
            </span>
          </div>
        </div>

        {/* ↓ tighter padding on mobile */}
        <div className="flex flex-1 flex-col p-3 sm:p-5">
          <h3 className="mb-1.5 line-clamp-2 text-xs sm:text-base font-semibold leading-snug text-slate-900 dark:text-white transition-colors group-hover:text-blue-800 dark:group-hover:text-blue-400">
            {product.name}
          </h3>

          {/* ↓ line-clamp-2 on mobile instead of 3 */}
          <p className="flex-1 line-clamp-2 sm:line-clamp-3 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {product.shortDescription || product.description}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300">
              View Details
              <svg className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 transition-colors duration-300 group-hover:bg-blue-800 dark:group-hover:bg-blue-600">
              <svg className="h-3 w-3 sm:h-4 sm:w-4 text-blue-700 dark:text-blue-400 transition-colors group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}