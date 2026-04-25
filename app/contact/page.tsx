import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Finstar Industrial Systems for quotes, inquiries, or technical support. We're here to help.",
};

export default function ContactPage() {
  return (
    <div className="pt-16 lg:pt-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-950 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-blue-300 text-sm mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-white font-medium">Contact</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3">Contact Us</h1>
          <p className="text-blue-200 text-lg max-w-2xl">
            Have a project in mind? Need a quote or technical support? We'd love to hear from you.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
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
                  value="+254 700 123 456"
                  href="tel:+254700123456"
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
              </div>
            </div>

            {/* Emergency */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="font-bold text-orange-800 mb-1">Emergency Support</h3>
                  <p className="text-orange-700 text-sm mb-3">
                    24/7 emergency breakdown support available for critical systems.
                  </p>
                  <a
                    href="tel:+254700999000"
                    className="inline-flex items-center gap-1.5 text-orange-600 font-bold text-sm hover:text-orange-700"
                  >
                    +254 700 999 000
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl overflow-hidden aspect-video shadow-lg">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                // src="https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=Industrial+Area,Nairobi+Kenya"
                src="https://www.google.com/maps?q=Industrial+Area,Nairobi&output=embed"
              ></iframe>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-7 lg:p-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Send Us a Message</h2>
            <p className="text-slate-500 text-sm mb-7">
              Fill in the form and our team will get back to you within 24 hours.
            </p>
            <ContactForm />
          </div>
        </div>
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
