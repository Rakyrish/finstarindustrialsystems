"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { navigationCategories } from "@/lib/data";
import { buildCategoryPath } from "@/lib/seo";
import { ThemeToggle } from "./ThemeToggle";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeAll = () => {
    setIsMenuOpen(false);
    setIsProductsDropdownOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40  transition-all duration-300 ${isScrolled
        ? "bg-white dark:bg-slate-900 shadow-lg"
        : "bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm"
        }`}
    >
      {/* Orange bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400" />

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 lg:h-20">

          {/* Logo */}
          <Link href="/" onClick={closeAll} className="flex items-center gap-3 group shrink-0">
            <div className="flex items-center gap-3">

              <Image
                src="/logo.png"
                alt="Finstar Industrial Systems Ltd logo"
                width={64}
                height={64}
                priority
                className="h-16 w-16 object-contain flex-shrink-0"
              />
              <div className="flex flex-col justify-center leading-tight">
                <span className="text-slate-900 dark:text-white font-bold text-xl lg:text-2xl leading-none tracking-tight">
                  Finstar
                </span>
                <span className="text-orange-500 text-xs lg:text-sm font-semibold tracking-widest uppercase mt-0.5">
                  Industrial Systems
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            <NavLink href="/">Home</NavLink>

            {/* Products Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsProductsDropdownOpen(true)}
              onMouseLeave={() => setIsProductsDropdownOpen(false)}
            >
              <button
                className="flex items-center gap-1 px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 text-sm font-semibold"
                aria-expanded={isProductsDropdownOpen}
              >
                Products
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isProductsDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isProductsDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-2xl dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-2">
                    <Link
                      href="/products"
                      onClick={closeAll}
                      className="flex items-center gap-2 px-3 py-2.5 text-slate-800 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-700 dark:hover:text-orange-400 rounded-lg transition-colors text-sm font-semibold border-b border-slate-100 dark:border-slate-800 mb-1"
                    >
                      🛍️ All Products
                    </Link>
                    {navigationCategories.slice(0, 10).map((cat) => (
                      <Link
                        key={cat.id}
                        href={buildCategoryPath(cat.slug)}
                        onClick={closeAll}
                        className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-700 dark:hover:text-orange-400 rounded-lg transition-colors text-sm font-medium"
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <NavLink href="/about">About Us</NavLink>
            <NavLink href="/contact">Contact</NavLink>
          </div>

          {/* Desktop CTA & Theme Toggle */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <Link
              href="/contact"
              className="px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-all duration-200 text-sm shadow-md hover:shadow-orange-500/30"
            >
              Get a Quote
            </Link>
          </div>

          {/* Mobile Menu Toggle & Theme Toggle */}
          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-orange-500 py-4 space-y-1 bg-white dark:bg-slate-900">
            <MobileNavLink href="/" onClick={closeAll}>Home</MobileNavLink>
            <div>
              <button
                onClick={() => setIsProductsDropdownOpen(!isProductsDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm font-semibold"
              >
                <span>Products</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isProductsDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isProductsDropdownOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-orange-400 pl-3">
                  <MobileNavLink href="/products" onClick={closeAll}>🛍️ All Products</MobileNavLink>
                  {navigationCategories.slice(0, 10).map((cat) => (
                    <MobileNavLink key={cat.id} href={buildCategoryPath(cat.slug)} onClick={closeAll}>
                      {cat.icon} {cat.name}
                    </MobileNavLink>
                  ))}
                </div>
              )}
            </div>
            <MobileNavLink href="/about" onClick={closeAll}>About Us</MobileNavLink>
            <MobileNavLink href="/contact" onClick={closeAll}>Contact</MobileNavLink>
            <div className="pt-2">
              <Link
                href="/contact"
                onClick={closeAll}
                className="block w-full text-center px-5 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors text-sm"
              >
                Get a Quote
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 text-sm font-semibold"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-3 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm font-semibold"
    >
      {children}
    </Link>
  );
}
