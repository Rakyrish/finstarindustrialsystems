"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { usePathname } from "next/navigation";
import { navigationCategories, megaMenuGroups, getCategoryMeta } from "@/lib/data";
import { buildCategoryPath } from "@/lib/seo";
import { ThemeToggle } from "./ThemeToggle";
import { useSavedProducts } from "@/lib/useSavedProducts";
import GlobalSearch from "./GlobalSearch";
import type { Product } from "@/types";

interface NavbarProps {
  products?: Product[];
}

export default function Navbar({ products = [] }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const megaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const { savedCount } = useSavedProducts();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setMobileProductsOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Global keyboard shortcut Ctrl+K / Cmd+K to open search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function openMega() {
    if (megaTimeoutRef.current) clearTimeout(megaTimeoutRef.current);
    setMegaOpen(true);
  }

  function closeMega() {
    megaTimeoutRef.current = setTimeout(() => setMegaOpen(false), 120);
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-white/98 dark:bg-slate-900/98 shadow-lg shadow-slate-900/5"
            : "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md"
        }`}
      >
        {/* Brand accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400" />

        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10" aria-label="Main navigation">
          <div className="flex items-center justify-between h-16 lg:h-20">

            {/* Logo */}
            <Link href="/" aria-label="Finstar Industrial Systems — Home" className="flex items-center gap-3 group shrink-0">
              <Image
                src="/logo.png"
                alt="Finstar Industrial Systems Ltd logo"
                width={56}
                height={56}
                priority
                className="h-12 w-12 lg:h-14 lg:w-14 object-contain flex-shrink-0"
              />
              <div className="flex flex-col justify-center leading-tight">
                <span className="text-slate-900 dark:text-white font-bold text-lg lg:text-xl leading-none tracking-tight">
                  Finstar
                </span>
                <span className="text-orange-500 text-[10px] lg:text-xs font-semibold tracking-widest uppercase mt-0.5">
                  Industrial Systems
                </span>
              </div>
            </Link>

            {/* ── Desktop Nav ────────────────────────────────────────────── */}
            <div className="hidden lg:flex items-center gap-1">
              <NavLink href="/" active={isActive("/") && pathname === "/"}>Home</NavLink>

              {/* Products with Mega Menu */}
              <div
                className="relative"
                onMouseEnter={openMega}
                onMouseLeave={closeMega}
              >
                <button
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive("/products")
                      ? "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  aria-expanded={megaOpen}
                  aria-haspopup="true"
                  id="products-menu-btn"
                >
                  Products
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* ── Mega Menu Panel ──────────────────────────────────── */}
                <div
                  onMouseEnter={openMega}
                  onMouseLeave={closeMega}
                  className={`mega-menu absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[820px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-200 ${
                    megaOpen
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 -translate-y-2 pointer-events-none"
                  }`}
                  role="region"
                  aria-label="Product categories"
                >
                  {/* Mega menu header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-500">Product Catalogue</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Industrial Equipment for East Africa</p>
                    </div>
                    <Link
                      href="/products"
                      className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                    >
                      View All
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>

                  {/* Category groups — 4 columns */}
                  <div className="grid grid-cols-4 gap-0 p-6">
                    {megaMenuGroups.map((group) => (
                      <div key={group.title} className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-3 px-2">
                          {group.title}
                        </p>
                        {group.slugs.map((slug) => {
                          const meta = getCategoryMeta(slug);
                          return (
                            <Link
                              key={slug}
                              href={buildCategoryPath(slug)}
                              className="flex items-start gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-orange-50 dark:hover:bg-slate-800 group/item"
                            >
                              <span className="text-lg leading-none mt-0.5 transition-transform duration-200 group-hover/item:scale-110">
                                {meta.icon}
                              </span>
                              <span className="font-medium text-slate-700 dark:text-slate-300 group-hover/item:text-orange-700 dark:group-hover/item:text-orange-400 leading-tight text-xs">
                                {meta.name}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800">
                    <Link href="/products" className="text-xs font-semibold text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400">
                      Browse full catalogue →
                    </Link>
                    <Link href="/contact" className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400">
                      Request a quote →
                    </Link>
                  </div>
                </div>
              </div>

              <NavLink href="/about" active={isActive("/about")}>About Us</NavLink>
              <NavLink href="/contact" active={isActive("/contact")}>Contact</NavLink>
            </div>

            {/* ── Desktop Right Controls ───────────────────────────────── */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {/* Search button */}
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search products (Ctrl+K)"
                title="Search products (Ctrl+K)"
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:border-orange-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden xl:inline">Search</span>
                <kbd className="hidden xl:inline rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 text-[10px] font-medium text-slate-400">⌘K</kbd>
              </button>

              {/* Saved products */}
              <Link
                href="/saved"
                aria-label={`Saved products (${savedCount})`}
                className="relative flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 h-9 w-9 text-slate-500 dark:text-slate-400 hover:border-orange-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {savedCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white">
                    {savedCount > 9 ? "9+" : savedCount}
                  </span>
                )}
              </Link>

              <ThemeToggle />

              <Link
                href="/contact"
                className="px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all duration-200 text-sm shadow-sm hover:shadow-orange-500/25"
              >
                Get a Quote
              </Link>
            </div>

            {/* ── Mobile Right Controls ────────────────────────────────── */}
            <div className="lg:hidden flex items-center gap-2">
              {/* Mobile search */}
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Mobile saved */}
              <Link
                href="/saved"
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-colors"
                aria-label={`Saved products (${savedCount})`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {savedCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white">
                    {savedCount > 9 ? "9+" : savedCount}
                  </span>
                )}
              </Link>

              <ThemeToggle />

              {/* Hamburger */}
              <button
                onClick={() => setMobileOpen((o) => !o)}
                className="p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* ── Mobile Sidebar ──────────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[min(85vw,380px)] bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
            <Image src="/logo.png" alt="Finstar" width={36} height={36} className="h-9 w-9 object-contain" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">Finstar</p>
              <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wider">Industrial Systems</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <MobileNavLink href="/" active={pathname === "/"} onClick={() => setMobileOpen(false)}>Home</MobileNavLink>

          {/* Products accordion */}
          <div>
            <button
              onClick={() => setMobileProductsOpen((o) => !o)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive("/products")
                  ? "text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>Products</span>
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${mobileProductsOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Mobile categories accordion panel */}
            <div className={`overflow-hidden transition-all duration-300 ${mobileProductsOpen ? "max-h-[1000px]" : "max-h-0"}`}>
              <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-orange-400/30 pl-3">
                <Link
                  href="/products"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
                >
                  <span className="text-base">🏭</span>
                  All Products
                </Link>
                {megaMenuGroups.map((group) => (
                  <div key={group.title}>
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
                      {group.title}
                    </p>
                    {group.slugs.map((slug) => {
                      const meta = getCategoryMeta(slug);
                      return (
                        <Link
                          key={slug}
                          href={buildCategoryPath(slug)}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
                        >
                          <span className="text-base">{meta.icon}</span>
                          <span>{meta.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <MobileNavLink href="/about" active={isActive("/about")} onClick={() => setMobileOpen(false)}>About Us</MobileNavLink>
          <MobileNavLink href="/contact" active={isActive("/contact")} onClick={() => setMobileOpen(false)}>Contact</MobileNavLink>
          <MobileNavLink href="/saved" active={isActive("/saved")} onClick={() => setMobileOpen(false)}>
            <span className="flex items-center gap-2">
              Saved Products
              {savedCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                  {savedCount}
                </span>
              )}
            </span>
          </MobileNavLink>
        </div>

        {/* Drawer footer CTA */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/contact"
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center px-5 py-3.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors text-sm"
          >
            Get a Quote
          </Link>
        </div>
      </div>

      {/* ── Global Search Modal ─────────────────────────────────────────────── */}
      <Suspense>
        <GlobalSearch
          products={products}
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
      </Suspense>
    </>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
        active
          ? "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10"
          : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`block px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
        active
          ? "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10"
          : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </Link>
  );
}
