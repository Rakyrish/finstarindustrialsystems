"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomepageSearch() {
    const router = useRouter();
    const [query, setQuery] = useState("");

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed) {
            router.push(`/products?search=${encodeURIComponent(trimmed)}`);
        } else {
            router.push("/products");
        }
    }

    return (
        <form onSubmit={handleSearch} className="relative w-full">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products e.g. refrigeration unit, boiler..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 pr-28 pl-11 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none transition"
            />
            {/* Search icon */}
            <svg
                className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
            {/* Clear button */}
            {query && (
                <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute top-1/2 right-24 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
            {/* Submit button */}
            <button
                type="submit"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-400 transition-colors"
            >
                Search
            </button>
        </form>
    );
}