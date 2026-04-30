"use client";

/**
 * ProductDescription — renders AI-generated HTML product content safely.
 *
 * Features:
 *  - Basic XSS sanitisation (strips <script>, on* attributes, javascript: URIs)
 *  - Falls back to plain-text display when no HTML is detected
 *  - Applies scoped styles via the `.fpc` wrapper
 *  - Mobile-first layout with card-style list items
 */

interface ProductDescriptionProps {
  content: string;
  className?: string;
}

// ─── Sanitiser ───────────────────────────────────────────────────────────────

function sanitiseHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(?:href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, "")
    .replace(/<\/?(?:iframe|object|embed|form|base)\b[^>]*>/gi, "");
}

/**
 * Normalises AI-generated list items so the dash is always
 * inside the <span>, giving CSS a clean structure to work with.
 *
 * Handles patterns like:
 *   <li><strong>Label</strong> — text</li>
 *   <li><strong>Label</strong>— text</li>
 *   <li><strong>Label</strong><span>text</span></li>  (no dash — keep as-is)
 */
function normaliseLists(html: string): string {
  return html.replace(
    /<li>([\s\S]*?)<\/li>/gi,
    (_, inner: string) => {
      // Already has <strong> + <span> — nothing to do
      if (/<strong[\s\S]*?<\/strong>[\s\S]*?<span/.test(inner)) {
        return `<li>${inner}</li>`;
      }

      // Pattern: <strong>Label</strong> [—|-] rest of text (may or may not have a span)
      const match = inner.match(
        /^([\s\S]*?<\/strong>)\s*[—\-\u2013\u2014]?\s*([\s\S]*)$/i
      );

      if (match) {
        const [, strongPart, rest] = match;
        // Strip any existing <span> tags wrapping the rest
        const stripped = rest.replace(/<\/?span[^>]*>/gi, "").trim();
        if (stripped) {
          return `<li>${strongPart}<span>— ${stripped}</span></li>`;
        }
      }

      return `<li>${inner}</li>`;
    }
  );
}

function containsHTML(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductDescription({
  content,
  className = "",
}: ProductDescriptionProps) {
  if (!content) return null;

  if (!containsHTML(content)) {
    return (
      <div className={`space-y-4 ${className}`.trim()}>
        {content.split("\n\n").map((paragraph, i) => (
          <p key={i} className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {paragraph}
          </p>
        ))}
      </div>
    );
  }

  const safeHTML = normaliseLists(sanitiseHTML(content));

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        /* ══════════════════════════════════════
           WRAPPER
        ══════════════════════════════════════ */
        .fpc {
          font-family: inherit;
          color: inherit;
          line-height: 1.75;
          font-size: 0.95rem;
        }

        /* ══════════════════════════════════════
           HEADINGS
        ══════════════════════════════════════ */
        .fpc h2 {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ea580c, #f97316);
          color: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.5rem 1.1rem;
          border-radius: 0.45rem;
          margin-top: 2rem;
          margin-bottom: 1rem;
          max-width: 100%;
        }
        .fpc h2:first-child { margin-top: 0; }

        /* ══════════════════════════════════════
           PARAGRAPHS
        ══════════════════════════════════════ */
        .fpc p {
          margin-bottom: 1rem;
          font-size: 0.95rem;
          line-height: 1.8;
          color: #475569;
        }
        .dark .fpc p { color: #94a3b8; }

        /* ══════════════════════════════════════
           LISTS — shared base
        ══════════════════════════════════════ */
        .fpc ul {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        /* ── Desktop: 3-col grid (bullet | label | description) ── */
        .fpc ul li {
          display: grid;
          grid-template-columns: 8px auto 1fr;
          column-gap: 0.55rem;
          align-items: baseline;
          font-size: 0.93rem;
          color: #475569;
          line-height: 1.7;
        }
        .dark .fpc ul li { color: #94a3b8; }

        /* Bullet dot */
        .fpc ul li::before {
          content: "";
          display: block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #f97316;
          align-self: start;
          margin-top: 0.52rem;
          flex-shrink: 0;
        }

        /* Bold label */
        .fpc ul li strong {
          color: #0f172a;
          font-weight: 700;
          white-space: nowrap;
          line-height: 1.7;
        }
        .dark .fpc ul li strong { color: #f1f5f9; }

        /* Description span */
        .fpc ul li span {
          color: #475569;
          line-height: 1.7;
        }
        .dark .fpc ul li span { color: #94a3b8; }

        /* ══════════════════════════════════════
           LISTS — mobile (≤ 640px)
           Card layout: label on top, text below
        ══════════════════════════════════════ */
        @media (max-width: 640px) {
          .fpc ul {
            gap: 0.75rem;
          }

          .fpc ul li {
            /* Switch to single column flex-column card */
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 3px solid #f97316;
            border-radius: 0.5rem;
            padding: 0.7rem 0.85rem;
          }

          .dark .fpc ul li {
            background: #1e293b;
            border-color: #334155;
            border-left-color: #f97316;
          }

          /* Hide bullet — orange left border replaces it */
          .fpc ul li::before {
            display: none;
          }

          /* Label: full width, bold, slightly larger */
          .fpc ul li strong {
            display: block;
            white-space: normal;
            font-size: 0.9rem;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.4;
          }
          .dark .fpc ul li strong { color: #f1f5f9; }

          /* Description: full width below label, normal weight */
          .fpc ul li span {
            display: block;
            font-size: 0.875rem;
            color: #64748b;
            line-height: 1.65;
            white-space: normal;
          }
          .dark .fpc ul li span { color: #94a3b8; }

          /* Paragraphs */
          .fpc p {
            font-size: 0.9rem;
            line-height: 1.75;
          }

          /* Headings — full width on mobile */
          .fpc h2 {
            font-size: 0.75rem;
            padding: 0.45rem 0.85rem;
            width: 100%;
            border-radius: 0.4rem;
          }
        }

        /* ══════════════════════════════════════
           TABLE
        ══════════════════════════════════════ */
        .fpc .table-wrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 0.75rem;
          box-shadow: 0 1px 6px rgba(0,0,0,0.08);
          margin-bottom: 1.75rem;
        }

        .fpc table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
          min-width: 280px;
        }

        .fpc table thead tr {
          background: #1e293b;
          color: #f1f5f9;
        }

        .fpc table th {
          padding: 0.7rem 0.9rem;
          text-align: left;
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .fpc table td {
          padding: 0.65rem 0.9rem;
          vertical-align: top;
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
          line-height: 1.6;
        }

        .fpc table td:first-child {
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
          width: 38%;
        }

        .fpc table tbody tr:nth-child(odd)  { background-color: #f8fafc; }
        .fpc table tbody tr:nth-child(even) { background-color: #ffffff; }
        .fpc table tbody tr:last-child td   { border-bottom: none; }

        .dark .fpc table thead tr           { background: #0f172a; }
        .dark .fpc table td                 { color: #cbd5e1; border-bottom-color: #1e293b; }
        .dark .fpc table td:first-child     { color: #f1f5f9; }
        .dark .fpc table tbody tr:nth-child(odd)  { background-color: #1e293b; }
        .dark .fpc table tbody tr:nth-child(even) { background-color: #0f172a; }

        @media (max-width: 640px) {
          .fpc table td:first-child {
            white-space: normal;
            width: auto;
          }
          .fpc table th,
          .fpc table td {
            padding: 0.5rem 0.65rem;
            font-size: 0.82rem;
          }
        }

        /* ══════════════════════════════════════
           LINKS
        ══════════════════════════════════════ */
        .fpc a {
          color: #f97316;
          font-weight: 600;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.15s;
        }
        .fpc a:hover { border-bottom-color: #f97316; }
      `}} />

      <div
        className={`fpc ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: safeHTML }}
      />
    </>
  );
}