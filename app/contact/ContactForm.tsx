"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { submitInquiry } from "@/lib/api";

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

const subjectLabels: Record<string, string> = {
  refrigeration: "Refrigeration Systems",
  hvac: "Air Conditioning / HVAC",
  boilers: "Boilers & Steam Systems",
  "cold-rooms": "Cold Rooms & Insulation",
  fittings: "Industrial Fittings & Tools",
  maintenance: "Maintenance / Service",
  general: "General Inquiry",
};

export default function ContactForm() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormData>(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const productName = searchParams.get("product");
    if (!productName) {
      return;
    }

    const timer = setTimeout(() => {
      setForm((previous) => {
        if (previous.message.includes(productName)) {
          return previous;
        }

        const prefilledMessage = previous.message
          ? `${previous.message}\n\nProduct of interest: ${productName}`
          : `Product of interest: ${productName}\nPlease share pricing, specifications, and availability.`;

        return {
          ...previous,
          subject: previous.subject || "general",
          message: prefilledMessage,
        };
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  function buildInquiryMessage() {
    const lines = [
      form.subject ? `Subject: ${subjectLabels[form.subject] ?? form.subject}` : "",
      form.company ? `Company: ${form.company}` : "",
      form.phone ? `Phone: ${form.phone}` : "",
      "",
      form.message.trim(),
    ].filter(Boolean);

    return lines.join("\n");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      await submitInquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        message: buildInquiryMessage(),
      });

      setStatus("success");
      setForm(initialForm);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not send your inquiry. Please try again.",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h3 className="mb-2 text-xl font-bold text-green-800">
          Message Sent Successfully
        </h3>
        <p className="mb-6 text-sm text-green-700">
          Thank you for reaching out. Our team will get back to you within 24
          hours.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

      <div>
        <label htmlFor="subject" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Subject <span className="text-red-500">*</span>
        </label>
        <select
          id="subject"
          name="subject"
          value={form.subject}
          onChange={handleChange}
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-slate-700">
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
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {status === "error" ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Sending...
          </>
        ) : (
          <>
            Send Message
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
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
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  );
}
