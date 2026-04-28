// "use client"
import Image from "next/image";
import Link from "next/link";
import { getCategoryIcon } from "@/lib/data";
import { Product } from "@/types";
// import ContactButtons from "@/components/ContactButtons";

interface ProductCardProps {
  product: Product;
}

const categoryColors: Record<string, string> = {
  refrigeration: "bg-blue-100 text-blue-800",
  hvac: "bg-cyan-100 text-cyan-800",
  boilers: "bg-red-100 text-red-800",
  "cold-rooms": "bg-indigo-100 text-indigo-800",
  fittings: "bg-slate-100 text-slate-700",
};

export default function ProductCard({ product }: ProductCardProps) {
  const categoryIcon = getCategoryIcon(product.category.slug, product.category.icon);


  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
        <div className="relative h-52 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
          {product.imageUrl ? (
            <>
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="select-none text-7xl opacity-30">{categoryIcon}</span>
            </div>
          )}

          <div className="absolute top-3 left-3">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${categoryColors[product.category.slug] || "bg-slate-100 text-slate-700"
                }`}
            >
              {product.category.name}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-800">
            {product.name}
          </h3>
          <p className="flex-1 line-clamp-3 text-sm leading-relaxed text-slate-500">
            {product.shortDescription || product.description}
          </p>
          {/* <ContactButtons productName={product.name} /> */}


          <div className="mt-4 flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm font-semibold text-blue-700 group-hover:text-blue-800">
              View Details
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 transition-colors duration-300 group-hover:bg-blue-800">
              <svg
                className="h-4 w-4 text-blue-700 transition-colors group-hover:text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
