"""
AI SEO Optimizer — single-issue "Apply Fix" service.

Each detected SEO issue (see seo_scoring.py) maps to exactly one content
field. Structural fields (internal links, JSON-LD schemas) are rebuilt
deterministically from real product/DB data — never through the AI model,
so a "fix" can never invent a fact. Copy fields (title, meta description,
introduction, image metadata) are rewritten by a small, targeted OpenAI
call that only touches the one offending field, leaving the rest of the
content profile untouched.

`FIXABLE_ISSUE_IDS` is the single source of truth for which issues this
service can actually act on — seo_views.py uses it to correct the
`auto_fixable` flag on issues before they reach the frontend.
"""

import json
import logging

from django.conf import settings
from openai import OpenAI

from .ai_service import AIServiceError
from .seo_ai_service import build_internal_links
from .seo_schema_builder import (
    build_breadcrumb_schema,
    build_faq_schema,
    build_organization_schema,
    build_product_schema,
)

logger = logging.getLogger("products")


# issue id -> content field rewritten by a targeted AI call
AI_FIELD_FOR_ISSUE = {
    "title_too_short": "seo_title",
    "title_too_long": "seo_title",
    "title_missing_keyword": "seo_title",
    "title_missing_region": "seo_title",
    "title_missing_brand": "seo_title",
    "meta_too_short": "meta_description",
    "meta_too_long": "meta_description",
    "meta_missing_keyword": "meta_description",
    "meta_missing_action": "meta_description",
    "meta_poor_ending": "meta_description",
    "content_good_length": "introduction",
    "content_thin": "introduction",
    "content_very_thin": "introduction",
    "content_extremely_thin": "introduction",
    "keyword_missing_in_intro": "introduction",
    "keyword_missing_secondary": "introduction",
    "keyword_missing_longtail": "introduction",
    "keyword_density_low": "introduction",
    "keyword_density_high": "introduction",
    "readability_no_content": "introduction",
    "readability_no_sentences": "introduction",
    "readability_sentence_length": "introduction",
    "readability_sentence_length_poor": "introduction",
    "readability_very_long_sentences": "introduction",
    "image_image_seo_filename": "image_seo_filename",
    "image_image_alt_text": "image_alt_text",
    "image_image_title": "image_title",
    "image_image_caption": "image_caption",
    "image_image_description": "image_description",
}

# issue id -> content field rebuilt deterministically from real product/DB data
DETERMINISTIC_FIELD_FOR_ISSUE = {
    "linking_none": "internal_links",
    "linking_few": "internal_links",
    "linking_external": "internal_links",
    "schema_missing_product_schema": "product_schema",
    "schema_missing_faq_schema": "faq_schema",
    "schema_missing_breadcrumb_schema": "breadcrumb_schema",
    "schema_missing_organization_schema": "organization_schema",
}

FIXABLE_ISSUE_IDS = set(AI_FIELD_FOR_ISSUE) | set(DETERMINISTIC_FIELD_FOR_ISSUE)

FIELD_SPEC = {
    "seo_title": "a single-line SEO title, 50-60 characters",
    "meta_description": "a single-line meta description, 140-160 characters, ending with a clear call to action",
    "introduction": "an HTML string using only <p> tags, 150-250 words",
    "image_seo_filename": "an SEO-friendly kebab-case filename without a file extension",
    "image_alt_text": "descriptive alt text under 125 characters, including the product name",
    "image_title": "a short image title attribute",
    "image_caption": "a one-sentence image caption",
    "image_description": "a one-to-two sentence image description suitable for structured data",
}


def annotate_fixable(score: dict) -> dict:
    """Correct each issue's `auto_fixable` flag to match what this service can really do."""
    for issue in score.get("issues", []):
        issue["auto_fixable"] = issue.get("id") in FIXABLE_ISSUE_IDS
    return score


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


def _build_deterministic_fix(product, content: dict, field: str):
    if field == "internal_links":
        return build_internal_links(product)
    if field == "product_schema":
        return build_product_schema(product, content)
    if field == "faq_schema":
        return build_faq_schema(content)
    if field == "breadcrumb_schema":
        return build_breadcrumb_schema(product)
    if field == "organization_schema":
        return build_organization_schema()
    raise ValueError(f"No deterministic fix for field '{field}'")


def _build_ai_fix(product, content: dict, field: str, issue: dict) -> str:
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    if not api_key:
        raise AIServiceError("OpenAI API key is not configured.")
    model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
    client = OpenAI(api_key=api_key)

    category_name = product.category.name if product.category_id else "Industrial Equipment"

    prompt = (
        "You are an SEO editor for Finstar Industrial Systems Ltd, an industrial "
        "equipment supplier serving Kenya and East & Central Africa. You are fixing "
        f"ONE specific issue in an existing SEO content profile. Rewrite ONLY the "
        f"'{field}' field — every other field stays as-is. Never invent a model "
        "number, certification, price, or specification that isn't already present "
        "in the product facts or current profile below.\n\n"
        f"ISSUE: {issue.get('name')}\n"
        f"EXPLANATION: {issue.get('explanation')}\n"
        f"CURRENT VALUE: {issue.get('current_value')}\n"
        f"TARGET: {issue.get('recommended_value')}\n\n"
        f"The new '{field}' must be {FIELD_SPEC.get(field, 'a short string')}.\n\n"
        "PRODUCT FACTS:\n"
        f"Name: {product.name}\n"
        f"Category: {category_name}\n"
        f"Short Description: {product.short_description or '(none provided)'}\n\n"
        "CURRENT FULL SEO PROFILE (context only — do not repeat it back):\n"
        f"{json.dumps(content, ensure_ascii=False)[:4000]}\n\n"
        f'Return ONLY a valid JSON object: {{"value": "<new {field}>"}}. '
        "The JSON must parse with json.loads()."
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.4,
        )
    except Exception as exc:
        logger.exception("OpenAI SEO fix call failed for product %s field %s", product.pk, field)
        if "insufficient_quota" in str(exc).lower():
            raise AIServiceError(
                "OpenAI quota exceeded. Please check your credit balance at "
                "https://platform.openai.com/billing"
            ) from exc
        raise AIServiceError(f"AI fix request failed: {exc}") from exc

    raw_content = _strip_code_fences(response.choices[0].message.content or "")

    try:
        data = json.loads(raw_content)
        value = data["value"]
    except (json.JSONDecodeError, KeyError, TypeError) as err:
        logger.error("AI SEO fix returned unusable response: %s", raw_content[:500])
        raise AIServiceError("The AI failed to return a usable fix. Please try again.") from err

    if not isinstance(value, str) or not value.strip():
        raise AIServiceError("The AI returned an empty fix.")

    return value.strip()


def apply_issue_fix(product, content: dict, issue: dict):
    """
    Resolve the single field responsible for `issue` against `content` (a
    full SEO content dict). Returns (field_name, new_value). Never mutates
    `content` — the caller decides how to merge the result.
    """
    issue_id = issue.get("id", "")

    if issue_id in DETERMINISTIC_FIELD_FOR_ISSUE:
        field = DETERMINISTIC_FIELD_FOR_ISSUE[issue_id]
        return field, _build_deterministic_fix(product, content, field)

    field = AI_FIELD_FOR_ISSUE.get(issue_id)
    if not field:
        raise AIServiceError(f"No automated fix is available for issue '{issue_id}'.")

    return field, _build_ai_fix(product, content, field, issue)
