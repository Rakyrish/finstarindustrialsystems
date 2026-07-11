"""
AI SEO Optimizer — the single source of truth for "is this content allowed
to auto-publish, and what does publishing actually do."

Used by both the single-product "Regenerate & Publish" flow (seo_views.py)
and the bulk auto-publish flow (services/seo_bulk.py) — kept as one shared
module specifically so the two paths can never drift apart and quietly
enforce different rules.
"""

from django.utils import timezone

from .models import Product, ProductSEO, SEOVersion

# Minimum overall score (and absence of any HIGH-severity issue) required
# before AI-generated content is allowed to skip human review and publish
# straight to the live site. A human explicitly reviewing a draft and
# clicking "Apply Draft" can still publish anything — this only gates paths
# that skip that review.
AUTO_PUBLISH_MIN_SCORE = 80


def blocks_auto_publish(score: dict) -> str | None:
    """Returns a human-readable reason to block auto-publish, or None if it's clear."""
    high_severity = [i for i in score.get("issues", []) if i.get("severity") == "high"]
    if high_severity:
        names = ", ".join(i.get("name", i.get("id", "issue")) for i in high_severity[:3])
        return f"{len(high_severity)} high-severity issue(s) detected ({names})."
    if score.get("overall", 0) < AUTO_PUBLISH_MIN_SCORE:
        return f"Score {score.get('overall', 0)}/100 is below the {AUTO_PUBLISH_MIN_SCORE} minimum for auto-publish."
    return None


def _next_version_number(product: Product) -> int:
    last = SEOVersion.objects.filter(product=product).order_by("-version_number").first()
    return (last.version_number + 1) if last else 1


def _live_content_dict(seo: ProductSEO, content_fields: list[str]) -> dict:
    return {field: getattr(seo, field) for field in content_fields}


def publish_content(
    product: Product, seo: ProductSEO, content: dict, score: dict, user, content_fields: list[str],
) -> tuple[bool, int | None]:
    """
    Snapshots the current live content (if any) into a SEOVersion, then
    writes `content` as the new live ProductSEO state. Returns
    (version_created, version_id). Callers are responsible for the gate —
    this function always publishes what it's given.
    """
    version_created = False
    version_id = None

    if seo.published_at is not None:
        snapshot = {
            **_live_content_dict(seo, content_fields),
            "score_overall": seo.score_overall,
            "seo_issues": seo.seo_issues,
            "score_breakdown": seo.score_breakdown,
        }
        version = SEOVersion.objects.create(
            product=product,
            version_number=_next_version_number(product),
            reason=SEOVersion.Reason.PRE_APPLY,
            snapshot=snapshot,
            created_by=user,
        )
        version_created = True
        version_id = version.id

    for field in content_fields:
        setattr(seo, field, content[field])
    seo.score_overall = score["overall"]
    seo.score_breakdown = score["breakdown"]
    seo.seo_issues = score["issues"]
    seo.is_optimized = score["is_optimized"]
    seo.draft = None
    seo.published_at = timezone.now()
    seo.last_published_by = user
    seo.save()

    return version_created, version_id
