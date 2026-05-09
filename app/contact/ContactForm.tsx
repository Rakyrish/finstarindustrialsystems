"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { submitInquiry } from "@/lib/api";
import { useSavedProducts } from "@/lib/useSavedProducts";

// ── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  email: string;
  company: string;
  phone: string;
  subject: string;
  message: string;
}

const INITIAL_FORM: FormData = {
  name: "",
  email: "",
  company: "",
  phone: "",
  subject: "",
  message: "",
};

const SUBJECT_LABELS: Record<string, string> = {
  refrigeration: "Refrigeration Systems",
  hvac: "Air Conditioning / HVAC",
  boilers: "Boilers & Steam Systems",
  "cold-rooms": "Cold Rooms & Insulation",
  fittings: "Industrial Fittings & Tools",
  maintenance: "Maintenance / Service",
  general: "General Inquiry",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ContactForm() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { savedProducts, mounted: savedMounted } = useSavedProducts();

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [serverError, setServerError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  // Prevent duplicate submissions
  const isSubmittingRef = useRef(false);

  // Pre-fill from URL ?product= param
  useEffect(() => {
    const productParam = searchParams.get("product");
    const productsParam = searchParams.get("products");
    const subjectParam = searchParams.get("subject");

    setForm((prev) => {
      let msg = prev.message;
      let sub = prev.subject;

      if (subjectParam && SUBJECT_LABELS[subjectParam]) {
        sub = subjectParam;
      }

      if (productParam && !msg.includes(productParam)) {
        msg = msg
          ? `${msg}\n\nProduct of interest: ${productParam}`
          : `Product of interest: ${productParam}\n\nPlease share pricing, specifications, and availability.`;
        if (!sub) sub = "general";
      }

      if (productsParam && !msg.includes(productsParam.slice(0, 30))) {
        const decoded = decodeURIComponent(productsParam);
        msg = msg
          ? `${msg}\n\nProducts of interest: ${decoded}`
          : `Products of interest:\n${decoded}\n\nPlease provide pricing, specifications, and availability for the above items.`;
        if (!sub) sub = "general";
      }

      return { ...prev, subject: sub, message: msg };
    });
  }, [searchParams]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name as keyof FormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  // ── Client-side validation ─────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!form.name.trim() || form.name.trim().length < 2) {
      errors.name = "Please enter your full name (at least 2 characters).";
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!form.subject) {
      errors.subject = "Please select a subject for your inquiry.";
    }
    if (!form.message.trim() || form.message.trim().length < 10) {
      errors.message = "Please describe your inquiry (at least 10 characters).";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Build enriched message body ────────────────────────────────────────────
  function buildMessage(): string {
    const lines = [
      form.subject ? `Subject: ${SUBJECT_LABELS[form.subject] ?? form.subject}` : "",
      form.company ? `Company: ${form.company}` : "",
      form.phone ? `Phone: ${form.phone}` : "",
      "",
      form.message.trim(),
    ].filter(Boolean);
    return lines.join("\n");
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Prevent duplicate fire
    if (isSubmittingRef.current || status === "submitting") return;

    if (!validate()) return;

    isSubmittingRef.current = true;
    setStatus("submitting");
    setServerError("");

    // Collect saved product names for the email
    const savedProductNames =
      savedMounted && savedProducts.length > 0
        ? savedProducts.map((p) => p.name)
        : [];

    try {
      const result = await submitInquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company: form.company.trim(),
        subject: form.subject,
        message: buildMessage(),
        products: savedProductNames,
        source_url: typeof window !== "undefined" ? window.location.href : "",
      });

      setSubmittedName(form.name.trim().split(" ")[0]);
      setSubmittedEmail(form.email.trim());
      setEmailSent(result.emailSent ?? false);
      setStatus("success");
      setForm(INITIAL_FORM);
    } catch (err) {
      setStatus("error");
      setServerError(
        err instanceof Error
          ? err.message
          : "We could not send your inquiry. Please try again or contact us directly.",
      );
    } finally {
      isSubmittingRef.current = false;
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-900/40 dark:bg-green-900/10 sm:p-10"
      >
        {/* Animated check */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="h-8 w-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h3 className="mb-2 text-xl font-bold text-green-800 dark:text-green-300">
          Inquiry Received, {submittedName}!
        </h3>

        <p className="mb-2 text-sm leading-7 text-green-700 dark:text-green-400">
          Your inquiry has been successfully submitted to Finstar Industrial Systems Ltd.
          Our team will review your message and respond <strong>in a few</strong>.
        </p>

        {emailSent && (
          <div className="my-4 inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white/70 px-4 py-2 dark:border-green-800/40 dark:bg-green-900/20">
            <svg className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              A confirmation email has been sent to{" "}
              <span className="font-semibold">{submittedEmail}</span>
            </p>
          </div>
        )}

        <p className="mt-2 text-xs text-green-600/70 dark:text-green-500/70">
          If urgent, call us directly:{" "}
          <a href="tel:+254726559606" className="font-semibold underline hover:no-underline">
            +254 726 559 606
          </a>
        </p>

        <button
          onClick={() => { setStatus("idle"); setEmailSent(false); }}
          className="mt-6 rounded-xl border border-green-300 bg-white px-6 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-50 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40"
        >
          Submit Another Inquiry
        </button>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  const isSubmitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-label="Inquiry form">
      {/* Saved products notice */}
      {savedMounted && savedProducts.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
            🔖 {savedProducts.length} saved product{savedProducts.length === 1 ? "" : "s"} will be included in your inquiry.
          </p>
          <p className="mt-0.5 text-xs text-orange-600/70 dark:text-orange-400/70">
            {savedProducts.map((p) => p.name).join(" · ")}
          </p>
        </div>
      )}

      {/* Name + Email */}
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
          error={fieldErrors.name}
          disabled={isSubmitting}
          autoComplete="name"
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
          error={fieldErrors.email}
          disabled={isSubmitting}
          autoComplete="email"
        />
      </div>

      {/* Company + Phone */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          label="Company Name"
          id="company"
          name="company"
          type="text"
          value={form.company}
          onChange={handleChange}
          placeholder="Your Company Ltd"
          disabled={isSubmitting}
          autoComplete="organization"
        />
        <FormField
          label="Phone Number"
          id="phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="+254 700 000 000"
          disabled={isSubmitting}
          autoComplete="tel"
        />
      </div>

      {/* Subject */}
      <div>
        <label
          htmlFor="subject"
          className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
        >
          Subject <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <select
          id="subject"
          name="subject"
          value={form.subject}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!fieldErrors.subject}
          aria-describedby={fieldErrors.subject ? "subject-error" : undefined}
          className={`w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-orange-400/50 dark:bg-slate-800 dark:text-white ${fieldErrors.subject
              ? "border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-900/10"
              : "border-slate-200 bg-slate-50 dark:border-slate-700"
            }`}
        >
          <option value="">Select a subject…</option>
          <option value="refrigeration">Refrigeration Systems</option>
          <option value="hvac">Air Conditioning / HVAC</option>
          <option value="boilers">Boilers &amp; Steam Systems</option>
          <option value="cold-rooms">Cold Rooms &amp; Insulation</option>
          <option value="fittings">Industrial Fittings &amp; Tools</option>
          <option value="maintenance">Maintenance / Service</option>
          <option value="general">General Inquiry</option>
        </select>
        {fieldErrors.subject && (
          <p id="subject-error" role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            {fieldErrors.subject}
          </p>
        )}
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="message"
          className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
        >
          Message <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          value={form.message}
          onChange={handleChange}
          rows={5}
          required
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!fieldErrors.message}
          aria-describedby={fieldErrors.message ? "message-error" : undefined}
          placeholder="Tell us about your project, required specifications, quantities, or timeline…"
          className={`w-full resize-none rounded-xl border px-4 py-3 text-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 ${fieldErrors.message
              ? "border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-900/10"
              : "border-slate-200 bg-slate-50 dark:border-slate-700"
            }`}
        />
        {fieldErrors.message && (
          <p id="message-error" role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            {fieldErrors.message}
          </p>
        )}
      </div>

      {/* Server error */}
      {status === "error" && serverError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
        >
          <span className="font-semibold">Error: </span>{serverError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-orange-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <svg
              className="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending Inquiry…
          </>
        ) : (
          <>
            Send Inquiry
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        By submitting this form you agree to our privacy policy.
        We will never share your details with third parties.
      </p>
    </form>
  );
}

// ── FormField component ───────────────────────────────────────────────────────

function FormField({
  label,
  id,
  name,
  type,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  error,
  autoComplete,
}: {
  label: string;
  id: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
      >
        {label}{" "}
        {required && (
          <span className="text-red-500" aria-hidden="true">*</span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete={autoComplete}
        className={`w-full rounded-xl border px-4 py-3 text-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 ${error
            ? "border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-900/10"
            : "border-slate-200 bg-slate-50 dark:border-slate-700"
          }`}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
