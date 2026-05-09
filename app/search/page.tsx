import type { Metadata } from "next";
import Link from "next/link";
import { fetchAllProducts } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { buildCategoryPath } from "@/lib/seo";
import { navigationCategories } from "@/lib/data";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q = "" } = await searchParams;
  return {
    title: q ? `Search: "${q}"` : "Product Search",
    description: "Search the Finstar industrial equipment catalogue.",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();

  const allProducts = await fetchAllProducts().catch(() => []);

  const results = query.length < 2
    ? []
    : allProducts.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        (p.shortDescription || "").toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.name.toLowerCase().includes(query) ||
        Object.values(p.specs ?? {}).some((v) => String(v).toLowerCase().includes(query))
      );

  const matchedCategories = query.length >= 2
    ? navigationCategories.filter((c) =>
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      )
    : [];

  // Group results by category
  const byCategory = results.reduce<Record<string, typeof results>>((acc, product) => {
    const key = product.category.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(product);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 to-slate-900 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400 mb-3">
            Product Search
          </p>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
            {q ? (
              <>Results for &ldquo;<span className="text-orange-400">{q}</span>&rdquo;</>
            ) : (
              "Search the Catalogue"
            )}
          </h1>
          {q && (
            <p className="mt-3 text-blue-200">
              {results.length} product{results.length === 1 ? "" : "s"} found
              {matchedCategories.length > 0 && ` · ${matchedCategories.length} categor${matchedCategories.length === 1 ? "y" : "ies"} matched`}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Search form */}
        <form method="GET" action="/search" className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search products, categories, equipment…"
              autoFocus
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
            <button
              type="submit"
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Search
            </button>
          </div>
        </form>

        {/* No query */}
        {!query && (
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
              Browse by Category
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {navigationCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={buildCategoryPath(cat.slug)}
                  className="flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:border-orange-300 hover:text-orange-600 dark:hover:text-orange-400"
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty results */}
        {query.length >= 2 && results.length === 0 && matchedCategories.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              No results for &ldquo;{q}&rdquo;
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Try a different keyword or browse by category below.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 max-w-xl mx-auto">
              {navigationCategories.slice(0, 4).map((cat) => (
                <Link
                  key={cat.slug}
                  href={buildCategoryPath(cat.slug)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-orange-300 hover:text-orange-600 text-center transition"
                >
                  {cat.icon} {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Category matches */}
        {matchedCategories.length > 0 && (
          <section className="mb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
              Matching Categories
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {matchedCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={buildCategoryPath(cat.slug)}
                  className="flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 transition hover:border-orange-300 hover:shadow-sm"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{cat.name}</p>
                    <p className="text-xs text-slate-400 truncate">{cat.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Product results — grouped by category */}
        {results.length > 0 && Object.entries(byCategory).map(([categoryName, products]) => (
          <section key={categoryName} className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {categoryName}
                <span className="ml-2 text-sm font-normal text-slate-400">({products.length})</span>
              </h2>
              <Link
                href={buildCategoryPath(products[0].category.slug)}
                className="text-sm font-semibold text-orange-500 hover:text-orange-600"
              >
                View category →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
