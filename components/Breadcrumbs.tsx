import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/seo";

function ChevronRight() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function Breadcrumbs({
  items,
  light = false,
}: {
  items: BreadcrumbItem[];
  light?: boolean;
}) {
  return (
    <nav
      className={`flex flex-wrap items-center gap-2 text-sm ${light ? "text-blue-300" : "text-slate-500 dark:text-slate-400"}`}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.href}-${item.name}`} className="flex items-center gap-2">
            {index > 0 && <ChevronRight />}
            {isLast ? (
              <span className={`font-medium ${light ? "text-white" : "text-slate-900 dark:text-white"}`}>
                {item.name}
              </span>
            ) : (
              <Link
                href={item.href}
                className={`transition-colors ${light ? "hover:text-white" : "hover:text-orange-500 dark:hover:text-orange-400"}`}
              >
                {item.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
