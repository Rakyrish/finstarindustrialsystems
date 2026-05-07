import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import FAQSection from "@/components/FAQSection";
import { BreadcrumbJsonLd, FAQJsonLd, ServicesJsonLd } from "@/components/JsonLd";
import SectionWrapper, { SectionHeader } from "@/components/SectionWrapper";
import { services } from "@/lib/data";
import { buildPageMetadata, type BreadcrumbItem } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About Finstar Industrial Systems Ltd",
  description:
    "Learn about Finstar Industrial Systems Ltd, a Nairobi-based supplier of industrial refrigeration, HVAC, boiler, cold room, and engineering products serving Kenya and East Africa.",
  path: "/about",
  keywords: [
    "industrial engineering company Kenya",
    "refrigeration contractors Nairobi",
    "HVAC contractors Kenya",
    "industrial equipment supplier Nairobi",
  ],
});

const aboutFaqs = [
  {
    question: "What does Finstar Industrial Systems Ltd specialize in?",
    answer:
      "Finstar Industrial Systems Ltd specializes in industrial refrigeration equipment, HVAC systems, cold room solutions, industrial boilers, and related engineering products for projects across Kenya and East Africa.",
  },
  {
    question: "Where does Finstar Industrial Systems Ltd operate?",
    answer:
      "The business is based in Nairobi, Kenya and supports supply and engineering requirements across Kenya, Uganda, Tanzania, Rwanda, DRC Congo, Burundi, and nearby regional markets.",
  },
  {
    question: "Why is Finstar relevant for industrial procurement in East Africa?",
    answer:
      "Finstar combines local market knowledge, category-specific product coverage, and direct quotation paths that help industrial buyers compare equipment and source support more efficiently.",
  },
];


export default function AboutPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "About Us", href: "/about" },
  ];

  return (
    <div>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <ServicesJsonLd services={services.map((service) => ({ title: service.title, description: service.description }))} />
      <FAQJsonLd faqs={aboutFaqs} />
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-950 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Breadcrumbs items={breadcrumbs} light />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3">About Us</h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Years of industrial refrigeration, HVAC, cold room, and boiler supply expertise rooted in Nairobi and serving East Africa.
          </p>
        </div>
      </div>

      {/* Company Overview */}
      <SectionWrapper>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-orange-500 font-semibold text-sm uppercase tracking-widest">Our Story</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-5 leading-tight">
              Powering Industry Across East Africa
            </h2>
            <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                Finstar Industrial Systems was founded with a simple but powerful mission: to be the most
                trusted supplier and installer of industrial cooling and heating systems in East Africa. What started
                as a small team of three engineers has grown into a 150-strong organisation serving clients across
                Kenya, Uganda, Tanzania, and beyond.
              </p>
              <p>
                Over the years, we have built a reputation for delivering world-class equipment – from precision
                refrigeration units and high-efficiency HVAC systems to industrial boilers and bespoke cold room
                installations. Our success is rooted in our people: certified engineers who treat every project as
                their own.
              </p>
              <p>
                Today, we partner with leading manufacturers across Europe, Asia, and the Americas to bring
                cutting-edge technology to East African industries, always backed by our own rigorous quality
                standards and exceptional after-sales support.
              </p>
            </div>
          </div>
          {/* Visual Stat Panel */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "500+", label: "Satisfied Clients", icon: "🤝" },
              { value: "1,200+", label: "Projects Completed", icon: "⚙️" },
              { value: "150+", label: "Team Members", icon: "👷" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-slate-800 rounded-2xl p-6 text-center border border-blue-100 dark:border-blue-900/50"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-extrabold text-blue-900 dark:text-blue-400">{stat.value}</div>
                <div className="text-blue-700 dark:text-blue-400 text-sm mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* Services */}
      <SectionWrapper className="bg-slate-50 dark:bg-slate-900/50">
        <SectionHeader
          subtitle="What We Do"
          title="Our Services"
          description="From initial consultation to long-term maintenance, we offer a complete range of industrial services."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 dark:border-slate-800 group"
            >
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                {service.icon}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                {service.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Mission & Vision */}
      <SectionWrapper dark className="bg-blue-950">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-white mb-3">Our Mission</h2>
            <p className="text-blue-200 leading-relaxed">
              To deliver reliable, innovative, and energy-efficient industrial systems that empower businesses
              across East Africa to grow, operate safely, and achieve their full potential – always backed by
              exceptional engineering expertise and customer service.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
            <div className="text-4xl mb-4">🔭</div>
            <h2 className="text-2xl font-bold text-white mb-3">Our Vision</h2>
            <p className="text-blue-200 leading-relaxed">
              To be East Africa&apos;s foremost industrial systems company – recognised for technical excellence,
              unwavering reliability, and a legacy of transforming industries through smart, sustainable
              engineering solutions that stand the test of time.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* Core Values */}
      <SectionWrapper>
        <SectionHeader
          subtitle="What We Stand For"
          title="Our Core Values"
          description="The principles that guide every decision we make and every project we deliver."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: "🛡️",
              title: "Integrity",
              text: "We do what we say, and we say what we do. Honesty and transparency define every client relationship.",
            },
            {
              icon: "⭐",
              title: "Excellence",
              text: "We set the highest standards in everything we deliver – from equipment quality to after-sales support.",
            },
            {
              icon: "🌱",
              title: "Sustainability",
              text: "We prioritise energy-efficient solutions that reduce carbon footprints and lower operating costs.",
            },
            {
              icon: "🤝",
              title: "Partnership",
              text: "We build long-term relationships, treating every client as a partner in their success and growth.",
            },
          ].map((val) => (
            <div
              key={val.title}
              className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 border-2 border-slate-100 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 group overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-400 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="text-3xl mb-3">{val.icon}</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">{val.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{val.text}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* CTA */}
      <section className="py-16 bg-orange-500">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Let&apos;s Work Together</h2>
          <p className="text-orange-100 mb-8 text-lg">
            Ready to discuss your industrial equipment needs? Our expert team is here to help.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-all duration-200 shadow-xl text-base"
          >
            Get In Touch
          </Link>
        </div>
      </section>

      <SectionWrapper className="py-12 lg:py-16">
        <FAQSection
          title="About Finstar Industrial Systems Ltd"
          description="Common questions about who we are, where we operate, and the industrial sectors we serve across Kenya and East Africa."
          faqs={aboutFaqs}
        />
      </SectionWrapper>
    </div>
  );
}
