import type { FaqItem } from "@/lib/seo";

export default function FAQSection({
  title,
  description,
  faqs,
  light = false,
}: {
  title: string;
  description?: string;
  faqs: FaqItem[];
  light?: boolean;
}) {
  return (
    <section aria-labelledby="faq-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-8">
      <div className="max-w-3xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
          FAQ
        </p>
        <h2
          id="faq-heading"
          className={`text-2xl font-bold ${light ? "text-white" : "text-slate-900 dark:text-white"}`}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>

      <dl className="mt-6 space-y-4">
        {faqs.map((faq) => (
          <div
            key={faq.question}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60"
          >
            <dt className="text-base font-semibold text-slate-900 dark:text-white">
              {faq.question}
            </dt>
            <dd className="faq-answer mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
              {faq.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
