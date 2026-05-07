"use client";

interface ProductDescriptionProps {
  content: string;
  className?: string;
}

function containsHTML(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

function sanitiseHTML(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<(?:iframe|object|embed|form|base)\b[^>]*>[\s\S]*?<\/(?:iframe|object|embed|form|base)>/gi, "")
    .replace(/<(?:iframe|object|embed|form|base)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s+(href|src)\s*=\s*(["']?)([^"'\s>]+)\2/gi,
      (_, attribute: string, quote: string, value: string) => {
        if (/^\s*javascript:/i.test(value)) {
          return "";
        }
        return ` ${attribute}=${quote}${value}${quote}`;
      },
    );
}

function normaliseLists(html: string) {
  return html.replace(/<li>([\s\S]*?)<\/li>/gi, (_, inner: string) => {
    if (/<strong[\s\S]*?<\/strong>\s*<span/i.test(inner)) {
      return `<li>${inner}</li>`;
    }

    const match = inner.match(/^([\s\S]*?<\/strong>)\s*[—\-–]?\s*([\s\S]*)$/i);
    if (!match) {
      return `<li>${inner}</li>`;
    }

    const [, strongPart, description] = match;
    const cleanedDescription = description
      .replace(/<\/?span[^>]*>/gi, "")
      .replace(/^\s*[—\-–]\s*/, "")
      .trim();

    if (!cleanedDescription) {
      return `<li>${inner}</li>`;
    }

    return `<li>${strongPart}<span>— ${cleanedDescription}</span></li>`;
  });
}

function wrapTables(html: string) {
  return html.replace(/<table\b[\s\S]*?<\/table>/gi, (tableMarkup: string) => {
    if (/<div[^>]+class=["'][^"']*table-wrap/.test(tableMarkup)) {
      return tableMarkup;
    }

    return `<div class="table-wrap">${tableMarkup}</div>`;
  });
}

function normaliseHTML(html: string) {
  return wrapTables(normaliseLists(sanitiseHTML(html)));
}

export default function ProductDescription({
  content,
  className = "",
}: ProductDescriptionProps) {
  if (!content?.trim()) {
    return null;
  }

  if (!containsHTML(content)) {
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return (
      <div className={`space-y-4 ${className}`.trim()}>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-[0.95rem] leading-8 text-slate-500 dark:text-slate-400">
            {paragraph}
          </p>
        ))}
      </div>
    );
  }

  const safeHTML = normaliseHTML(content);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .fpc {
              color: inherit;
              font-size: 0.95rem;
              line-height: 1.8;
            }

            .fpc h2 {
              display: inline-flex;
              align-items: center;
              background: linear-gradient(135deg, #ea580c, #fb923c);
              color: #fff;
              border-radius: 999px;
              font-size: 0.8rem;
              font-weight: 800;
              letter-spacing: 0.1em;
              margin: 2rem 0 1rem;
              padding: 0.55rem 1rem;
              text-transform: uppercase;
            }

            .fpc h2:first-child {
              margin-top: 0;
            }

            .fpc p {
              color: #64748b;
              font-size: 0.95rem;
              line-height: 1.8;
              margin: 0 0 1rem;
            }

            .dark .fpc p {
              color: #94a3b8;
            }

            .fpc ul,
            .fpc ol {
              display: grid;
              gap: 0.75rem;
              list-style: none;
              margin: 0 0 1.5rem;
              padding: 0;
            }

            .fpc li {
              align-items: start;
              color: #475569;
              column-gap: 0.75rem;
              display: grid;
              grid-template-columns: 8px minmax(0, auto) minmax(0, 1fr);
              line-height: 1.7;
            }

            .dark .fpc li {
              color: #94a3b8;
            }

            .fpc li::before {
              align-self: start;
              background: #f97316;
              border-radius: 999px;
              content: "";
              display: block;
              height: 7px;
              margin-top: 0.7rem;
              width: 7px;
            }

            .fpc li strong {
              color: #0f172a;
              font-weight: 700;
              white-space: nowrap;
            }

            .dark .fpc li strong {
              color: #f8fafc;
            }

            .fpc li span {
              color: #475569;
            }

            .dark .fpc li span {
              color: #94a3b8;
            }

            .fpc .table-wrap {
              margin: 0 0 1.75rem;
              overflow-x: auto;
              border-radius: 1rem;
              box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
            }

            .fpc table {
              border-collapse: collapse;
              min-width: 320px;
              width: 100%;
            }

            .fpc thead tr {
              background: #1e293b;
            }

            .fpc th {
              color: #f8fafc;
              font-size: 0.75rem;
              font-weight: 700;
              letter-spacing: 0.08em;
              padding: 0.8rem 1rem;
              text-align: left;
              text-transform: uppercase;
              white-space: nowrap;
            }

            .fpc td {
              border-bottom: 1px solid #e2e8f0;
              color: #334155;
              line-height: 1.65;
              padding: 0.75rem 1rem;
              vertical-align: top;
            }

            .dark .fpc td {
              border-bottom-color: #334155;
              color: #cbd5e1;
            }

            .fpc td:first-child {
              color: #0f172a;
              font-weight: 700;
              white-space: nowrap;
              width: 38%;
            }

            .dark .fpc td:first-child {
              color: #f8fafc;
            }

            .fpc tbody tr:nth-child(odd) {
              background: #f8fafc;
            }

            .fpc tbody tr:nth-child(even) {
              background: #fff;
            }

            .dark .fpc tbody tr:nth-child(odd) {
              background: #1e293b;
            }

            .dark .fpc tbody tr:nth-child(even) {
              background: #0f172a;
            }

            .fpc dl {
              display: grid;
              gap: 0.9rem;
              margin: 0 0 1.75rem;
            }

            .fpc dt {
              color: #0f172a;
              font-weight: 700;
            }

            .dark .fpc dt {
              color: #f8fafc;
            }

            .fpc dd {
              border-left: 3px solid #fdba74;
              color: #64748b;
              margin: 0.35rem 0 0;
              padding-left: 0.85rem;
            }

            .dark .fpc dd {
              color: #94a3b8;
            }

            .fpc a {
              border-bottom: 1px solid transparent;
              color: #f97316;
              font-weight: 600;
              text-decoration: none;
              transition: border-color 0.15s ease;
            }

            .fpc a:hover {
              border-bottom-color: currentColor;
            }

            @media (max-width: 640px) {
              .fpc h2 {
                border-radius: 0.8rem;
                display: flex;
                font-size: 0.75rem;
                justify-content: center;
                padding: 0.5rem 0.85rem;
                width: 100%;
              }

              .fpc p {
                font-size: 0.92rem;
              }

              .fpc li {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-left: 3px solid #f97316;
                border-radius: 0.85rem;
                display: flex;
                flex-direction: column;
                gap: 0.3rem;
                padding: 0.8rem 0.9rem;
              }

              .dark .fpc li {
                background: #1e293b;
                border-color: #334155;
              }

              .fpc li::before {
                display: none;
              }

              .fpc li strong,
              .fpc li span {
                white-space: normal;
              }

              .fpc li span {
                font-size: 0.9rem;
              }

              .fpc th,
              .fpc td {
                font-size: 0.82rem;
                padding: 0.6rem 0.75rem;
              }

              .fpc td:first-child {
                white-space: normal;
                width: auto;
              }
            }
          `,
        }}
      />

      <div
        className={`fpc ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: safeHTML }}
      />
    </>
  );
}
