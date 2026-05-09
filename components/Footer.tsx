import Image from "next/image";
import Link from "next/link";
import { navigationCategories } from "@/lib/data";
import { buildCategoryPath } from "@/lib/seo";
import ContactButtons from "./ContactButtons";

export default function Footer() {
  return (
    <footer className="relative bg-slate-800 text-slate-300">
      {/* Orange accent bar — correctly at footer top */}
      <div className="h-[3px] bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400" />
      {/* Main Footer */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">

            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-lg flex items-center justify-center p-1.5 shadow-sm group-hover:bg-orange-50 transition-colors">
                <Image
                  src="/logo.png"
                  alt="Finstar Industrial Systems Ltd logo"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-white font-bold text-lg leading-none">Finstar</span>
                <span className="block text-slate-400 text-xs font-medium tracking-wider uppercase">
                  Industrial Systems
                </span>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Your trusted partner for industrial refrigeration, HVAC, boiler systems,
              cold rooms, and industrial fittings across East Africa
            </p>
            <div className="flex items-center gap-3">
              <SocialIcon href="https://www.linkedin.com/company/finstar-industrial" label="LinkedIn">
                <path
                  fillRule="evenodd"
                  d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
                  clipRule="evenodd"
                />
              </SocialIcon>
              <SocialIcon href="https://www.facebook.com/finstarindustrial" label="Facebook">
                <path
                  fillRule="evenodd"
                  d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                  clipRule="evenodd"
                />
              </SocialIcon>
            </div>
          </div>

          {/* Products — all categories in 2-col grid */}
          <nav aria-label="Product category links" className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Product Categories</h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {navigationCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={buildCategoryPath(cat.slug)}
                    className="text-slate-400 hover:text-orange-400 text-xs transition-colors flex items-center gap-1.5 leading-relaxed"
                  >
                    <span className="text-sm shrink-0">{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>


          {/* Company */}
          <nav aria-label="Company links">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-2">
              {[
                { label: "Home", href: "/" },
                { label: "About Us", href: "/about" },
                { label: "All Products", href: "/products" },
                { label: "Saved Products", href: "/saved" },
                { label: "Industrial Refrigeration", href: buildCategoryPath("refrigeration") },
                { label: "HVAC Systems", href: buildCategoryPath("hvac") },
                { label: "Cold Room Solutions", href: buildCategoryPath("cold-rooms") },
                { label: "Boilers & Steam", href: buildCategoryPath("boilers-steam-systems") },
                { label: "Contact Us", href: "/contact" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-orange-400 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-slate-400">
                <svg className="w-4 h-4 mt-0.5 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Industrial Area, Nairobi, Kenya
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-400">
                <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +254 726 559 606
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-400">
                <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                info@finstarindustrial.com
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-400">
                <svg className="w-4 h-4 mt-0.5 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mon–Fri: 8am – 6pm<br />Sat: 9am – 1pm
              </li>
              <li>
                <a
                  href="https://www.google.com/maps/place/Finstar+Industrial+Systems+Ltd/@-1.3050988,36.8390376,837m/data=!3m2!1e3!4b1!4m6!3m5!1s0x182f11c670b98d43:0x6f348874e48071b5!8m2!3d-1.3050988!4d36.8390376!16s%2Fg%2F11x8c2x1hk?entry=ttu&g_ep=EgoyMDI2MDQyNy4wIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-2 py-2 text-base font-bold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Map
                </a>
              </li>
              <li>
                <ContactButtons />
              </li>

            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-slate-500 text-xs text-center">
            © {new Date().getFullYear()} Finstar Industrial Systems. All rights reserved.
          </p>
          <p className="text-slate-600 text-xs">
            Built with precision for industry
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="w-8 h-8 bg-slate-800 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-colors duration-200"
    >
      <svg className="w-4 h-4 fill-current text-slate-400 hover:text-white" viewBox="0 0 24 24">
        {children}
      </svg>
    </a>
  );
}
