import type { Metadata } from "next";
import Link from "next/link";
import { getFeaturedProducts, categories, services } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import CategoryCard from "@/components/CategoryCard";
import SectionWrapper, { SectionHeader } from "@/components/SectionWrapper";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Finstar Industrial Systems – your trusted partner for refrigeration, HVAC, boilers, cold rooms, and industrial fittings across East Africa.",
};

export default function HomePage() {
  const featuredProducts = getFeaturedProducts();

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900" />
        {/* Geometric decorations */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-blue-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-800/20 to-transparent" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40 text-center">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 bg-blue-800/60 backdrop-blur-sm border border-blue-700/50 text-blue-200 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            Industrial Excellence Since 2005
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
            Industrial Equipment &{" "}
            <span className="relative">
              <span className="text-orange-400">Cooling</span>
            </span>{" "}
            Solutions
          </h1>

          <p className="text-lg sm:text-xl text-blue-200 max-w-3xl mx-auto mb-10 leading-relaxed">
            From precision refrigeration systems to industrial boilers, we supply and install
            world-class equipment for businesses across East Africa.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400 transition-all duration-200 shadow-2xl shadow-orange-500/30 hover:shadow-orange-400/40 text-base"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Contact Us
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200 text-base"
            >
              Explore Products
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: "500+", label: "Clients Served" },
              { value: "20+", label: "Years Experience" },
              { value: "5", label: "Product Categories" },
              { value: "24/7", label: "Support Available" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold text-orange-400">{stat.value}</div>
                <div className="text-blue-300 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* CATEGORIES */}
      <SectionWrapper className="bg-slate-50">
        <SectionHeader
          subtitle="What We Offer"
          title="Our Product Categories"
          description="We supply and install a comprehensive range of industrial systems and equipment tailored to your needs."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </SectionWrapper>

      {/* FEATURED PRODUCTS */}
      <SectionWrapper>
        <SectionHeader
          subtitle="Top Picks"
          title="Featured Products"
          description="Explore our most popular industrial equipment trusted by leading companies across East Africa."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-blue-800 text-blue-800 font-semibold rounded-xl hover:bg-blue-800 hover:text-white transition-all duration-200"
          >
            View All Products
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </SectionWrapper>

      {/* SERVICES */}
      <SectionWrapper dark className="bg-slate-900">
        <SectionHeader
          subtitle="Our Services"
          title="What We Do"
          description="Complete solutions from design and supply to installation, commissioning and ongoing maintenance."
          light
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-orange-500/50 hover:bg-slate-800 transition-all duration-300 group"
            >
              <div className="text-3xl mb-3">{service.icon}</div>
              <h3 className="text-white font-bold text-base mb-2 group-hover:text-orange-400 transition-colors">
                {service.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* WHY CHOOSE US */}
      <SectionWrapper className="bg-white">
        <SectionHeader
          subtitle="Why Finstar"
          title="Built for Industry, Trusted by Business"
          description="We combine technical excellence with local expertise to deliver solutions that last."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: "🎯",
              title: "Expert Engineers",
              text: "Our certified engineers bring decades of hands-on industrial experience.",
            },
            {
              icon: "⚙️",
              title: "Premium Equipment",
              text: "We source only top-tier equipment from internationally certified manufacturers.",
            },
            {
              icon: "🔄",
              title: "End-to-End Service",
              text: "From design and supply to installation, commissioning, and ongoing maintenance.",
            },
            {
              icon: "⚡",
              title: "Fast Response",
              text: "24/7 emergency support to minimise downtime and keep your operations running.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="text-center p-6 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors duration-300 group"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-800 transition-colors">
                {item.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* CTA BANNER */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600" />
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 50%, white 0%, transparent 50%), radial-gradient(circle at 75% 50%, white 0%, transparent 50%)`,
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
            Ready to Upgrade Your Industrial Systems?
          </h2>
          <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
            Get in touch today for a free consultation and custom quote from our expert team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-all duration-200 shadow-xl text-base"
            >
              Contact Us Today
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-600 text-white font-bold rounded-xl border-2 border-white/30 hover:bg-orange-700 transition-all duration-200 text-base"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
