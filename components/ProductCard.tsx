import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const categoryLabels: Record<string, string> = {
    refrigeration: "Refrigeration",
    hvac: "HVAC",
    boilers: "Boilers & Steam",
    "cold-rooms": "Cold Rooms",
    fittings: "Fittings & Tools",
  };

  const categoryColors: Record<string, string> = {
    refrigeration: "bg-blue-100 text-blue-800",
    hvac: "bg-cyan-100 text-cyan-800",
    boilers: "bg-red-100 text-red-800",
    "cold-rooms": "bg-indigo-100 text-indigo-800",
    fittings: "bg-slate-100 text-slate-700",
  };

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <article className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-slate-100 h-full flex flex-col">
        {/* Image */}
        <div className="relative h-52 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl opacity-30 select-none">
              {product.category === "refrigeration" && "❄️"}
              {product.category === "hvac" && "💨"}
              {product.category === "boilers" && "🔥"}
              {product.category === "cold-rooms" && "🏭"}
              {product.category === "fittings" && "🔧"}
            </span>
          </div>
          {/* Overlay gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                categoryColors[product.category] || "bg-slate-100 text-slate-700"
              }`}
            >
              {categoryLabels[product.category] || product.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-semibold text-slate-900 text-base leading-snug mb-2 group-hover:text-blue-800 transition-colors line-clamp-2">
            {product.name}
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed flex-1 line-clamp-3">
            {product.shortDescription}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-blue-700 text-sm font-semibold group-hover:text-blue-800 flex items-center gap-1">
              View Details
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <div className="w-8 h-8 bg-blue-50 group-hover:bg-blue-800 rounded-lg flex items-center justify-center transition-colors duration-300">
              <svg
                className="w-4 h-4 text-blue-700 group-hover:text-white transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
