"use client";

import { useState, FormEvent } from "react";

interface FormData {
  name: string;
  email: string;
  company: string;
  phone: string;
  subject: string;
  message: string;
}

const initialForm: FormData = {
  name: "",
  email: "",
  company: "",
  phone: "",
  subject: "",
  message: "",
};

export default function ContactForm() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    // Simulated submission delay
    await new Promise((r) => setTimeout(r, 1500));
    setStatus("success");
    setForm(initialForm);
  };

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-green-800 mb-2">Message Sent Successfully!</h3>
        <p className="text-green-700 text-sm mb-6">
          Thank you for reaching out. Our team will get back to you within 24 hours.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="px-6 py-2.5 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors text-sm"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormField
          label="Full Name"
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          placeholder="John Doe"
          required
        />
        <FormField
          label="Email Address"
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="john@company.com"
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormField
          label="Company Name"
          id="company"
          name="company"
          type="text"
          value={form.company}
          onChange={handleChange}
          placeholder="Acme Industries Ltd"
        />
        <FormField
          label="Phone Number"
          id="phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="+254 700 000 000"
        />
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm font-semibold text-slate-700 mb-1.5">
          Subject <span className="text-red-500">*</span>
        </label>
        <select
          id="subject"
          name="subject"
          value={form.subject}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 text-sm"
        >
          <option value="">Select a subject...</option>
          <option value="refrigeration">Refrigeration Systems</option>
          <option value="hvac">Air Conditioning / HVAC</option>
          <option value="boilers">Boilers & Steam Systems</option>
          <option value="cold-rooms">Cold Rooms & Insulation</option>
          <option value="fittings">Industrial Fittings & Tools</option>
          <option value="maintenance">Maintenance / Service</option>
          <option value="general">General Inquiry</option>
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          value={form.message}
          onChange={handleChange}
          rows={5}
          required
          placeholder="Tell us about your project or inquiry..."
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 text-sm resize-none placeholder:text-slate-400"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-500/20 text-base"
      >
        {status === "submitting" ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            Send Message
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}

function FormField({
  label,
  id,
  name,
  type,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  id: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 text-sm placeholder:text-slate-400"
      />
    </div>
  );
}
