import Link from "next/link";
import { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/products?category=${category.slug}`} className="group block">
      <article className="relative bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-slate-100 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative">
          {/* Icon */}
          <div className="text-4xl mb-3">{category.icon}</div>

          {/* Title */}
          <h3 className="font-bold text-slate-900 text-base mb-2 group-hover:text-blue-800 transition-colors">
            {category.name}
          </h3>

          {/* Description */}
          <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-3">
            {category.description}
          </p>

          {/* Product count */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              {category.productCount} Products
            </span>
            <span className="text-blue-700 text-sm font-semibold group-hover:text-blue-900 flex items-center gap-1">
              Browse
              <svg
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
