import Link from "next/link";
import { buildCategoryPath } from "@/lib/seo";
import { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={buildCategoryPath(category.slug)} className="group block">
      <article className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md dark:shadow-slate-900/50 hover:shadow-2xl dark:hover:shadow-slate-900/80 transition-all duration-300 hover:-translate-y-1 border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative">
          {/* Icon */}
          <div className="text-4xl mb-3">{category.icon}</div>

          {/* Title */}
          <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
            {category.name}
          </h3>

          {/* Description */}
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2 mb-3">
            {category.description}
          </p>

          {/* Product count */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {category.productCount} Products
            </span>
            <span className="text-blue-700 dark:text-blue-400 text-sm font-semibold group-hover:text-blue-900 dark:group-hover:text-blue-300 flex items-center gap-1">
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
