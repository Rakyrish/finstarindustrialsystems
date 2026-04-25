"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { categories } from "@/lib/data";
import Image from "next/image";

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-blue-900 shadow-2xl" : "bg-blue-900/95 backdrop-blur-sm"
        }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" onClick={closeAll} className="flex items-center gap-2 group">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-lg flex items-center justify-center p-1.5 shadow-sm group-hover:bg-orange-50 transition-colors">
              <Image
                src="/logo.png"
                alt="Finstar Logo"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            {/* <img src="/logo.png" alt="Finstar Logo" width={50} height={50} /> */}
            <div>
              <span className="text-white font-bold text-lg leading-none">Finstar</span>
              <span className="block text-blue-300 text-xs font-medium tracking-wider uppercase">
                Industrial Systems
              </span>
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
                className="flex items-center gap-1 px-4 py-2 text-blue-100 hover:text-white hover:bg-blue-800 rounded-lg transition-all duration-200 text-sm font-medium"
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
                <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden">
                  <div className="p-2">
                    <Link
                      href="/products"
                      onClick={closeAll}
                      className="flex items-center gap-2 px-3 py-2.5 text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-sm font-semibold border-b border-slate-100 mb-1"
                    >
                      🛍️ All Products
                    </Link>
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/products?category=${cat.slug}`}
                        onClick={closeAll}
                        className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-sm"
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

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/contact"
              className="px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-400 transition-all duration-200 text-sm shadow-lg hover:shadow-orange-500/30"
            >
              Get a Quote
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-blue-100 hover:text-white hover:bg-blue-800 rounded-lg transition-colors"
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-blue-800 py-4 space-y-1">
            <MobileNavLink href="/" onClick={closeAll}>Home</MobileNavLink>
            <div>
              <button
                onClick={() => setIsProductsDropdownOpen(!isProductsDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-blue-100 hover:text-white hover:bg-blue-800 rounded-lg transition-colors text-sm font-medium"
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
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-blue-700 pl-3">
                  <MobileNavLink href="/products" onClick={closeAll}>🛍️ All Products</MobileNavLink>
                  {categories.map((cat) => (
                    <MobileNavLink key={cat.id} href={`/products?category=${cat.slug}`} onClick={closeAll}>
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
                className="block w-full text-center px-5 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-400 transition-colors text-sm"
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
      className="px-4 py-2 text-blue-100 hover:text-white hover:bg-blue-800 rounded-lg transition-all duration-200 text-sm font-medium"
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
      className="block px-4 py-3 text-blue-100 hover:text-white hover:bg-blue-800 rounded-lg transition-colors text-sm font-medium"
    >
      {children}
    </Link>
  );
}
