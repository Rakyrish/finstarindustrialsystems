import type { Metadata } from "next";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import ProductsClient from "./ProductsClient";
import { getCategories, getProducts } from "@/lib/api";
import { Category, Product } from "@/types";

export const metadata: Metadata = {
  title: "Industrial Equipment Products - Refrigeration, HVAC, Boilers & Cold Rooms",
  description:
    "Browse Finstar's industrial refrigeration systems, HVAC units, steam boilers, cold rooms, and industrial fittings.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Industrial Products | Refrigeration, HVAC, Boilers & Cold Rooms - Finstar",
    description:
      "Shop industrial-grade refrigeration, HVAC, boilers, cold rooms, and fittings trusted across East Africa.",
    url: "https://finstarindustrial.com/products",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Finstar Industrial Products",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Industrial Products | Finstar Industrial Systems",
    description:
      "Industrial-grade refrigeration, HVAC, boilers, cold rooms and fittings for East Africa.",
    images: ["/og-image.png"],
  },
};

async function getProductsPageData(): Promise<{
  products: Product[];
  categories: Category[];
}> {
  const [products, categories] = await Promise.all([
    getProducts({ pageSize: 100 }),
    getCategories(),
  ]);

  return {
    products: products.results,
    categories,
  };
}

export default async function ProductsPage() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let hasApiError = false;

  try {
    const data = await getProductsPageData();
    products = data.products;
    categories = data.categories;
  } catch {
    hasApiError = true;
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-blue-900 to-blue-950 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav
            className="mb-4 flex items-center gap-2 text-sm text-blue-300"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-white">
              Home
            </Link>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="font-medium text-white">Products</span>
          </nav>
          <h1 className="mb-3 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            Our Products
          </h1>
          <p className="max-w-2xl text-lg text-blue-200">
            Industrial-grade equipment for refrigeration, HVAC, boilers, cold
            rooms, and more.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {hasApiError ? (
          <EmptyState
            title="Failed to load products"
            description="The product catalog could not be reached. Check the API connection and try again."
            icon="⚠️"
            action={{ label: "Back Home", href: "/" }}
          />
        ) : (
          <ProductsClient initialProducts={products} categories={categories} />
        )}
      </div>
    </div>
  );
}
