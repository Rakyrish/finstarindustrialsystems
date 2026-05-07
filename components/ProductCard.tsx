import Image from "next/image";
import Link from "next/link";
import { getCategoryIcon } from "@/lib/data";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

const categoryColors: Record<string, string> = {
  refrigeration: "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200",
  hvac: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-200",
  boilers: "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200",
  "cold-rooms": "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200",
  fittings: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function buildImageGrid(imageUrls: string[]) {
  if (imageUrls.length <= 1) {
    return imageUrls;
  }

  const filled = [...imageUrls];
  while (filled.length < 4) {
    filled.push(filled[filled.length - 1]);
  }
  return filled.slice(0, 4);
}

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrls = product.imageUrls.length > 0
    ? product.imageUrls
    : product.imageUrl
      ? [product.imageUrl]
      : [];
  const imageGrid = buildImageGrid(imageUrls);
  const hasMultipleImages = imageUrls.length >= 2;
  const hasImages = imageGrid.length > 0;
  const categoryIcon = getCategoryIcon(product.category.slug, product.category.icon);
  const badgeClassName = categoryColors[product.category.slug]
    ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <Link href={`/products/${product.slug}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-950/40">
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 sm:h-48 md:h-56 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
          {hasImages ? (
            <>
              {hasMultipleImages ? (
                <div className="grid h-full grid-cols-2 grid-rows-2 gap-1 p-1">
                  {imageGrid.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="relative overflow-hidden rounded-xl">
                      <Image
                        src={imageUrl}
                        alt={`${product.name} view ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 25vw, (max-width: 1280px) 20vw, 15vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Image
                  src={imageGrid[0]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-slate-900/10 to-transparent" />

              <div className="absolute bottom-3 right-3">
                <div className="rounded-xl border border-white/20 bg-white/80 p-1.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-950/65">
                  <Image
                    src="/logo.png"
                    alt="Finstar Industrial Systems Ltd"
                    width={44}
                    height={44}
                    className="h-8 w-8 object-contain opacity-85 sm:h-10 sm:w-10"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="select-none text-5xl opacity-30 sm:text-6xl">
                {categoryIcon}
              </span>
            </div>
          )}

          <div className="absolute left-3 top-3">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-xs ${badgeClassName}`}>
              {product.category.name}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-3 md:p-5">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-800 sm:text-sm md:text-base dark:text-white dark:group-hover:text-blue-300">
            {product.name}
          </h3>

          <p className="mt-2 flex-1 line-clamp-2 text-xs leading-relaxed text-slate-500 sm:text-sm md:line-clamp-3 dark:text-slate-400">
            {product.shortDescription || product.description}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 transition-colors group-hover:text-blue-900 sm:text-sm dark:text-blue-400 dark:group-hover:text-blue-200">
              View Details
              <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </span>

            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition-all duration-300 group-hover:bg-blue-800 group-hover:text-white dark:bg-blue-950/50 dark:text-blue-300 dark:group-hover:bg-blue-500">
              <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
