import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import FAQSection from "@/components/FAQSection";
import { BreadcrumbJsonLd, ContactPageJsonLd, FAQJsonLd } from "@/components/JsonLd";
import ContactForm from "./ContactForm";

import ContactButtons from "@/components/ContactButtons";
import { buildPageMetadata, contactFaqs, type BreadcrumbItem } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact Finstar Industrial Systems Ltd in Nairobi, Kenya",
  description:
    "Contact Finstar Industrial Systems Ltd in Nairobi for industrial refrigeration, HVAC, cold room, boiler, and engineering product quotes across Kenya and East Africa.",
  path: "/contact",
  keywords: [
    "industrial refrigeration quote Kenya",
    "HVAC contractors Kenya",
    "cold room installation Kenya",
    "industrial engineering Nairobi",
  ],
});

export default function ContactPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <div>
      <ContactPageJsonLd />
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd faqs={contactFaqs} />
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-950 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Breadcrumbs items={breadcrumbs} light />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3">Contact Us</h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Contact our Nairobi team for industrial refrigeration, HVAC, cold room, boiler, and engineering product support across Kenya and East Africa.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <section className="mb-10 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              Local SEO Signals
            </p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Nairobi-based industrial supply support for Kenya and East Africa
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-8 text-slate-600 dark:text-slate-300">
              <p>
                Use this contact page when you need industrial refrigeration Kenya quotations, cold room installation Kenya support, HVAC systems Kenya sourcing, industrial boiler product guidance, or industrial engineering procurement assistance in Nairobi.
              </p>
              <p>
                The page is structured for local search, Google rich results, and AI search engines with clear location data, business contact details, and service coverage across Kenya, Uganda, Tanzania, Rwanda, DRC Congo, and Burundi.
              </p>
            </div>
          </article>

          <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              Fast Internal Paths
            </p>
            <div className="space-y-3 text-sm">
              <Link href="/products/category/refrigeration" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Industrial Refrigeration Kenya
              </Link>
              <Link href="/products/category/hvac" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                HVAC Systems Kenya
              </Link>
              <Link href="/products/category/cold-rooms" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Cold Room Products Kenya
              </Link>
              <Link href="/products/category/boilers" className="block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
                Industrial Boilers Kenya
              </Link>
            </div>
          </aside>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
          {/* Contact Info */}
          <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-blue-900 rounded-2xl p-7 text-white">
              <h2 className="text-xl font-bold mb-6">Get In Touch</h2>
              <div className="space-y-5">
                <ContactInfoItem
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                  label="Address"
                  value="Industrial Area, Enterprise Road, Nairobi, Kenya"
                />



                <ContactInfoItem
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  }
                  label="Phone"
                  value="+254 726 559 606"
                  href="tel:+254726559606"
                />
                <ContactInfoItem
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                  label="Email"
                  value="info@finstarindustrial.com"
                  href="mailto:info@finstarindustrial.com"
                />
                <ContactInfoItem
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  label="Working Hours"
                  value="Mon–Fri: 8am–6pm | Sat: 9am–1pm"
                />

                <ContactButtons />

                <a
                  href="https://www.google.com/maps/place/Finstar+Industrial+Systems+Ltd/@-1.3050988,36.8390376,837m/data=!3m2!1e3!4b1!4m6!3m5!1s0x182f11c670b98d43:0x6f348874e48071b5!8m2!3d-1.3050988!4d36.8390376!16s%2Fg%2F11x8c2x1hk?entry=ttu&g_ep=EgoyMDI2MDQyNy4wIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Map
                </a>
              </div>
            </div>

            {/* Emergency */}
            {/* <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="font-bold text-orange-800 mb-1">Emergency Support</h3>
                  <p className="text-orange-700 dark:text-orange-400 text-sm mb-3">
                    24/7 emergency breakdown support available for critical systems.
                  </p>
                  <a
                    href="tel:+254726559606"
                    className="inline-flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold text-sm hover:text-orange-700 dark:hover:text-orange-300"
                  >
                    +254 726 559 606
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div> */}

            {/* Map Placeholder */}
            {/* Map */}
            <div className="bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 rounded-2xl overflow-hidden aspect-video shadow-lg">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8565!2d36.8390376!3d-1.3050988!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f11c670b98d43%3A0x6f348874e48071b5!2sFinstar%20Industrial%20Systems%20Ltd!5e0!3m2!1sen!2ske!4v1680000000000!5m2!1sen!2ske"
              ></iframe>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-7 lg:p-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Send Us a Message</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-7">
              Fill in the form and our team will get back to you within 24 hours.
            </p>

            {/* The fix: Wrap the component that uses useSearchParams in Suspense */}
            <Suspense fallback={
              <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg w-full"></div>
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg w-full"></div>
                <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg w-full"></div>
                <div className="h-12 bg-orange-200 dark:bg-orange-900/50 rounded-lg w-1/3"></div>
              </div>
            }>
              <ContactForm />
            </Suspense>
          </div>
        </div>

        <section className="mt-12">
          <FAQSection
            title="Contact and service coverage FAQs"
            description="These answers help buyers and search engines understand where Finstar operates, what the business supplies, and how quotations are handled."
            faqs={contactFaqs}
          />
        </section>
      </div>
    </div>
  );
}

function ContactInfoItem({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0 text-orange-300">
        {icon}
      </div>
      <div>
        <div className="text-blue-300 text-xs uppercase tracking-wide font-semibold mb-0.5">{label}</div>
        <div className="text-white text-sm leading-relaxed">{value}</div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="group hover:opacity-80 transition-opacity">
        {content}
      </a>
    );
  }

  return content;
}
