import DOMPurify from "isomorphic-dompurify";

/**
 * Single source of truth for sanitizing AI-generated / admin-editable HTML
 * before it's ever passed to dangerouslySetInnerHTML — on the public product
 * page (ProductDescription) and in the admin SEO Optimizer's live/draft
 * preview (app/admin/seo/page.tsx). Both render the same untrusted content
 * (ProductSEO.introduction and friends), so both must go through this.
 *
 * Allowlist-based (not blocklist): only the tags/attributes actually used by
 * the generated product copy are permitted. Unlike a hand-rolled regex
 * blocklist, DOMPurify parses a real DOM tree, so it isn't defeated by
 * malformed/nested-tag reassembly or encoded-scheme bypasses.
 */
export function sanitizeProductHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h2", "h3", "p", "ul", "ol", "li", "strong", "em", "span", "div", "br",
      "table", "thead", "tbody", "tr", "th", "td", "dl", "dt", "dd", "a",
    ],
    ALLOWED_ATTR: ["href", "class", "title"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
  });
}
