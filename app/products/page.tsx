import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductsClient from "./ProductsClient";
import { LoadingPage } from "@/components/LoadingSpinner";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse Finstar's full range of industrial refrigeration systems, HVAC, boilers, cold rooms, and fittings. Find the right solution for your business.",
};

export default function ProductsPage() {
  return (
    <div className="pt-16 lg:pt-20">
      {/* Page Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-950 py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-blue-300 text-sm mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-white font-medium">Products</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3">
            Our Products
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Industrial-grade equipment for refrigeration, HVAC, boilers, cold rooms, and more.
          </p>
        </div>
      </div>

      {/* Products Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <Suspense fallback={<LoadingPage />}>
          <ProductsClient />
        </Suspense>
      </div>
    </div>
  );
}
