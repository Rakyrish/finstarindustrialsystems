"""
AI SEO Optimizer — content generation service.

Generates a full SEO content profile for a single product using the OpenAI
API (same client/model as ai_service.py). Internal links are NOT generated
by the model — they are built deterministically from real database rows so
that generated content can never reference a slug that doesn't exist.
"""

import json
import logging

from django.conf import settings
from openai import OpenAI

from .ai_service import AIServiceError

logger = logging.getLogger("products")


SEO_CONTENT_PROMPT = """You are a senior industrial-equipment SEO strategist and content engineer for **Finstar Industrial Systems Ltd**, a leading industrial equipment supplier serving Kenya, Uganda, Tanzania, Rwanda, Burundi, South Sudan, DR Congo, Ethiopia, Somalia, and all of East & Central Africa.

Your task is to generate a complete, enterprise-grade SEO content profile for the product described below, suitable for Google Search, Google AI Overviews, Google Rich Results, Bing Search, and industrial B2B procurement search.

──────────────────────────────────────
SEARCH INTENT TO OPTIMISE FOR
──────────────────────────────────────

Write content that ranks for all of these intents simultaneously:
- Product searches ("[product] specifications", "[product] price")
- Supplier / distributor searches ("[product] supplier Kenya", "[product] distributor East Africa")
- Wholesale / bulk buyer searches
- Price / quotation searches
- Location-based searches (per-country: Kenya, Uganda, Tanzania, Rwanda, Burundi, South Sudan, DR Congo, Ethiopia, Somalia)
- Industrial buyer / commercial buyer / procurement-team searches

──────────────────────────────────────
STRICT RULES
──────────────────────────────────────

- NEVER invent a model number, certification, price, or specification that isn't given below. If a detail is unknown, describe it generically without fabricating specifics.
- NEVER include URLs, hyperlinks, or slugs — those are added separately by the system.
- Mention "Finstar Industrial Systems Ltd" naturally 3-5 times across the whole profile, not just once.
- Mention "Kenya" and at least 3 other East/Central African countries from the list above.
- Tone: professional, persuasive, industrial/B2B, benefit-driven. Active voice. 12-20 words per sentence on average — vary it, but never write a single sentence over 40 words.
- The meta_description MUST contain the exact focus_keyword phrase verbatim — the same characters, in the same order, copied in exactly as you chose it. Do not paraphrase, reorder its words, or split it up.
- EVERY item in "features", "benefits", and "applications" must be written as one complete, grammatically standalone sentence ending in a period — not a sentence fragment. These lists get concatenated together for analysis elsewhere, so a fragment with no closing period silently merges into the next item and produces one unreadable run-on sentence; a period is what keeps each item readable on its own.
- The combined word count of introduction + features + benefits + applications + faqs must add up to 650+ words total — this is what determines whether the content is "thin." Use the higher end of every list-length range below, and don't pad with filler; add genuine, specific detail (use cases, operating conditions, buyer considerations) instead.

──────────────────────────────────────
RETURN FORMAT
──────────────────────────────────────

Return ONLY a valid JSON object (no markdown, no code fences, no commentary) with exactly these keys:

{
  "seo_title": "50-60 characters, includes focus keyword, product name, and 'Kenya' or a region",
  "meta_description": "140-160 characters, must contain the exact focus_keyword phrase verbatim, plus a benefit and a call to action",
  "focus_keyword": "the single primary keyword phrase this product should rank for",
  "secondary_keywords": ["5-8 related keyword phrases"],
  "long_tail_keywords": ["5-8 longer, more specific search phrases including buyer intent (price, supplier, wholesale, distributor, location)"],
  "introduction": "350-450 word HTML string (2-3 <p> tags) introducing the product, its purpose, typical operating conditions/use cases, and Finstar as the supplier — this is the main lever for total content depth, so make it substantive, not padded",
  "features": ["8-10 feature sentences, each a complete sentence ending in a period, starting with the feature name"],
  "benefits": ["8-10 benefit sentences, each a complete sentence ending in a period, framed around business value (reliability, efficiency, cost savings, compliance)"],
  "technical_specifications": {"Spec Name": "Spec Value", "...": "..."},
  "applications": ["6-8 complete sentences ending in a period, each describing a specific use case"],
  "industries_served": ["5-8 industry names, e.g. Food Processing, Hospitality, Pharmaceuticals, Manufacturing"],
  "delivery_locations": ["Kenya", "Uganda", "Tanzania", "Rwanda", "Burundi", "South Sudan", "DR Congo", "Ethiopia", "Somalia"],
  "faqs": [{"question": "...", "answer": "..."}, "6-8 question/answer pairs (each answer 2-3 full sentences) covering pricing, availability, delivery, installation, and suitability"],
  "cta_text": "1-2 sentence call to action inviting the buyer to request a quote from Finstar Industrial Systems Ltd",
  "image_seo_filename": "seo-friendly-kebab-case-filename-without-extension",
  "image_alt_text": "descriptive alt text under 125 characters including product name and Finstar",
  "image_title": "short image title attribute",
  "image_caption": "1 sentence caption suitable for display under the image",
  "image_description": "1-2 sentence longer image description for structured data"
}

All string values must be valid JSON strings (escape internal quotes). The JSON must parse with json.loads(). Do not include any of the keys "internal_links", "product_schema", "faq_schema", "breadcrumb_schema", or "organization_schema" — those are built by the system, not by you.
"""


def _build_product_context_block(product) -> str:
    # Built separately (not via SEO_CONTENT_PROMPT.format) because the prompt's
    # JSON schema example is full of literal { } braces that str.format() would
    # otherwise try to interpret as placeholders.
    category_name = product.category.name if product.category_id else "Industrial Equipment"
    return (
        "\n──────────────────────────────────────\n"
        "PRODUCT CONTEXT\n"
        "──────────────────────────────────────\n\n"
        f"Product Name: {product.name}\n"
        f"Category: {category_name}\n"
        f"Existing Short Description: {product.short_description or '(none provided)'}\n"
        f"Existing Description (HTML, may be empty): {(product.description or '')[:2000]}\n"
        f"Existing Technical Specs (JSON, may be empty): {json.dumps(product.specs or {}, ensure_ascii=False)}\n"
    )

REQUIRED_KEYS = {
    "seo_title",
    "meta_description",
    "focus_keyword",
    "secondary_keywords",
    "long_tail_keywords",
    "introduction",
    "features",
    "benefits",
    "technical_specifications",
    "applications",
    "industries_served",
    "delivery_locations",
    "faqs",
    "cta_text",
    "image_seo_filename",
    "image_alt_text",
    "image_title",
    "image_caption",
    "image_description",
}

# Every field that makes up one full "SEO content profile" — the AI-generated
# REQUIRED_KEYS plus the deterministically-built internal_links and 4 schemas.
# Used identically for ProductSEO's live columns, the draft JSON blob, and
# SEOVersion snapshots, so it lives here as the single source of truth.
CONTENT_FIELDS = [
    "seo_title", "meta_description", "focus_keyword",
    "secondary_keywords", "long_tail_keywords",
    "introduction", "features", "benefits", "technical_specifications",
    "applications", "industries_served", "delivery_locations",
    "faqs", "cta_text", "internal_links",
    "product_schema", "faq_schema", "breadcrumb_schema", "organization_schema",
    "image_seo_filename", "image_alt_text", "image_title",
    "image_caption", "image_description",
]


def _strip_code_fences(raw_content: str) -> str:
    raw_content = raw_content.strip()
    if raw_content.startswith("```"):
        lines = raw_content.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw_content = "\n".join(lines).strip()
    return raw_content


def build_internal_links(product) -> list:
    """
    Deterministically build internal link suggestions from real DB rows.
    Never AI-generated, so a link can never point at a slug that doesn't exist.
    """
    from .models import Product

    related = (
        Product.objects.filter(category=product.category, is_active=True)
        .exclude(pk=product.pk)
        .order_by("-featured", "-created_at")[:5]
    )

    links = [
        {"anchor_text": item.name, "url": f"/products/{item.slug}"}
        for item in related
    ]
    links.append({
        "anchor_text": f"More {product.category.name} products",
        "url": f"/products/category/{product.category.slug}",
    })
    return links


def generate_seo_content(product) -> dict:
    """
    Generate a full SEO content profile for `product` via OpenAI.
    Read-only with respect to the product — never writes to it.
    """
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    if not api_key:
        raise AIServiceError("OpenAI API key is not configured.")

    model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
    client = OpenAI(api_key=api_key)

    prompt = SEO_CONTENT_PROMPT + _build_product_context_block(product)

    messages = [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
    if product.image_url:
        messages[0]["content"].append(
            {"type": "image_url", "image_url": {"url": product.image_url}}
        )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=4500,
            temperature=0.4,
        )
    except Exception as exc:
        logger.exception("OpenAI SEO generation call failed for product %s", product.pk)
        if "insufficient_quota" in str(exc).lower():
            raise AIServiceError(
                "OpenAI quota exceeded. Please check your credit balance at "
                "https://platform.openai.com/billing"
            ) from exc
        raise AIServiceError(f"AI SEO generation request failed: {exc}") from exc

    try:
        raw_content = response.choices[0].message.content
        if not raw_content:
            raise AIServiceError("AI service returned an empty response.")
    except AIServiceError:
        raise
    except Exception as err:
        logger.error("Unexpected response structure from OpenAI: %s", response)
        raise AIServiceError("AI service returned an invalid data structure.") from err

    raw_content = _strip_code_fences(raw_content)

    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError as err:
        logger.error("AI returned non-JSON SEO response: %s", raw_content[:500])
        raise AIServiceError(
            "The AI failed to format the SEO content correctly. Please try again."
        ) from err

    missing = REQUIRED_KEYS - set(data.keys())
    if missing:
        logger.error("AI SEO response missing keys %s: %s", missing, data)
        raise AIServiceError("AI returned an incomplete SEO content profile.")

    seo_data = {key: data[key] for key in REQUIRED_KEYS}
    seo_data["internal_links"] = build_internal_links(product)
    seo_data["_ai_model_used"] = model

    return seo_data
