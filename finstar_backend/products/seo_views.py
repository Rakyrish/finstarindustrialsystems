"""
AI SEO Optimizer — Phase 1 admin API views (single-product pipeline).
"""

import logging

from django.db.models import Avg, Count, Min, Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .ai_service import AIServiceError
from .models import Product, ProductSEO, SEORegenerationJob, SEOVersion
from .serializers import SEOProductSummarySerializer, SEOVersionSerializer
from .seo_ai_service import CONTENT_FIELDS, REQUIRED_KEYS, generate_seo_content
from .seo_fix_service import annotate_fixable, apply_issue_fix
from .seo_schema_builder import build_all_schemas
from .seo_scoring import score_seo_content
from .services.seo_bulk import enqueue_seo_bulk_jobs

logger = logging.getLogger("products")


class JWTAdminMixin:
    """Enforce JWT authentication + IsAdminUser (mirrors views.py's mixin)."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]


def _live_content_dict(seo: ProductSEO) -> dict:
    return {field: getattr(seo, field) for field in CONTENT_FIELDS}


def _live_score_dict(seo: ProductSEO) -> dict:
    return {
        "overall": seo.score_overall,
        "breakdown": seo.score_breakdown,
        "is_optimized": seo.is_optimized,
        "issues": seo.seo_issues,  # Include SEO issues
    }


def _next_version_number(product: Product) -> int:
    last = SEOVersion.objects.filter(product=product).order_by("-version_number").first()
    return (last.version_number + 1) if last else 1


class SEOGenerateDraftView(JWTAdminMixin, APIView):
    """POST /api/admin/seo/products/<id>/generate — generate a new pending draft."""

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        seo, _ = ProductSEO.objects.get_or_create(product=product)

        try:
            ai_data = generate_seo_content(product)
        except AIServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        schemas = build_all_schemas(product, ai_data)
        content = {key: ai_data[key] for key in REQUIRED_KEYS}
        content["internal_links"] = ai_data["internal_links"]
        content.update(schemas)

        score = annotate_fixable(score_seo_content(product, content))

        seo.draft = {**content, "score": score}
        seo.generated_at = timezone.now()
        seo.last_generated_by = request.user
        seo.ai_model_used = ai_data.get("_ai_model_used", "")
        seo.save(update_fields=[
            "draft", "generated_at", "last_generated_by", "ai_model_used", "updated_at",
        ])

        return Response({
            "draft": content,
            "score": score,
            "generated_at": seo.generated_at,
        })


class SEOProductDetailView(JWTAdminMixin, APIView):
    """GET /api/admin/seo/products/<id> — current live + draft SEO state."""

    def get(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        seo = ProductSEO.objects.filter(product=product).first()

        product_data = SEOProductSummarySerializer(product).data

        if seo is None:
            return Response({
                "product": product_data,
                "live": None,
                "draft": None,
                "live_score": None,
                "draft_score": None,
                "has_pending_draft": False,
                "published_at": None,
                "generated_at": None,
            })

        draft = seo.draft
        draft_content = None
        draft_score = None
        if draft:
            draft_content = {field: draft.get(field) for field in CONTENT_FIELDS}
            draft_score = draft.get("score")

        live = _live_content_dict(seo) if seo.published_at else None
        live_score = _live_score_dict(seo) if seo.published_at else None

        return Response({
            "product": product_data,
            "live": live,
            "draft": draft_content,
            "live_score": live_score,
            "draft_score": draft_score,
            "has_pending_draft": bool(draft),
            "published_at": seo.published_at,
            "generated_at": seo.generated_at,
        })


class SEOApplyDraftView(JWTAdminMixin, APIView):
    """POST /api/admin/seo/products/<id>/apply — publish the pending draft."""

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        seo = get_object_or_404(ProductSEO, product=product)

        if not seo.draft:
            return Response(
                {"detail": "No pending draft to apply. Generate a draft first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        version_created = False
        version_id = None

        if seo.published_at is not None:
            snapshot = {
                **_live_content_dict(seo),
                "score_overall": seo.score_overall,
                "seo_issues": seo.seo_issues,  # Include SEO issues in snapshot
                "score_breakdown": seo.score_breakdown,
            }
            version = SEOVersion.objects.create(
                product=product,
                version_number=_next_version_number(product),
                reason=SEOVersion.Reason.PRE_APPLY,
                snapshot=snapshot,
                created_by=request.user,
            )
            version_created = True
            version_id = version.id

        content = {field: seo.draft.get(field) for field in CONTENT_FIELDS}
        score = annotate_fixable(score_seo_content(product, content))

        for field in CONTENT_FIELDS:
            setattr(seo, field, content[field])
        seo.score_overall = score["overall"]
        seo.score_breakdown = score["breakdown"]
        seo.seo_issues = score["issues"]  # Store SEO issues
        seo.is_optimized = score["is_optimized"]
        seo.draft = None
        seo.published_at = timezone.now()
        seo.last_published_by = request.user
        seo.save()

        return Response({
            "detail": "SEO content applied.",
            "live": content,
            "live_score": score,
            "version_created": version_created,
            "version_id": version_id,
        })


class SEOSaveDraftView(JWTAdminMixin, APIView):
    """
    PATCH /api/admin/seo/products/<id>/draft — persist manual edits to the
    pending draft (creating one from the current live content if none
    exists yet). Never touches live content — use Apply Draft for that.
    """

    def patch(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        seo, _ = ProductSEO.objects.get_or_create(product=product)

        base = seo.draft if seo.draft else _live_content_dict(seo)
        content = {field: base.get(field) for field in CONTENT_FIELDS}

        updates = request.data or {}
        unknown = set(updates.keys()) - set(CONTENT_FIELDS)
        if unknown:
            return Response(
                {"detail": f"Unknown field(s): {', '.join(sorted(unknown))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        content.update({key: value for key, value in updates.items() if key in CONTENT_FIELDS})

        score = annotate_fixable(score_seo_content(product, content))
        seo.draft = {**content, "score": score}
        seo.save(update_fields=["draft", "updated_at"])

        return Response({"draft": content, "score": score})


class SEOFixIssueView(JWTAdminMixin, APIView):
    """
    POST /api/admin/seo/products/<id>/fix — resolve a single detected SEO
    issue against the pending draft (creating one from live content if
    none exists). Body: {"issue_id": "..."}.
    """

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        seo = get_object_or_404(ProductSEO, product=product)

        issue_id = request.data.get("issue_id")
        if not issue_id:
            return Response({"detail": "issue_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        base = seo.draft if seo.draft else _live_content_dict(seo)
        content = {field: base.get(field) for field in CONTENT_FIELDS}

        current_score = score_seo_content(product, content)
        issue = next((i for i in current_score["issues"] if i.get("id") == issue_id), None)
        if issue is None:
            # Issue is already resolved in the current draft — return the up-to-date
            # state instead of an error so stale UIs can refresh cleanly.
            score = annotate_fixable(current_score)
            return Response({
                "draft": content,
                "score": score,
                "already_resolved": True,
                "detail": f"Issue '{issue_id}' is already resolved in the current draft.",
            })

        try:
            field, new_value = apply_issue_fix(product, content, issue)
        except AIServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        content[field] = new_value
        score = annotate_fixable(score_seo_content(product, content))
        seo.draft = {**content, "score": score}
        seo.save(update_fields=["draft", "updated_at"])

        return Response({
            "draft": content,
            "score": score,
            "fixed_field": field,
            "fixed_value": new_value,
        })


class SEOVersionListView(JWTAdminMixin, APIView):
    """GET /api/admin/seo/products/<id>/versions"""

    def get(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        versions = SEOVersion.objects.filter(product=product).order_by("-created_at")
        return Response(SEOVersionSerializer(versions, many=True).data)


class SEORestoreVersionView(JWTAdminMixin, APIView):
    """POST /api/admin/seo/products/<id>/versions/<version_id>/restore"""

    def post(self, request, product_id, version_id):
        product = get_object_or_404(Product, pk=product_id)
        seo = get_object_or_404(ProductSEO, product=product)
        version = get_object_or_404(SEOVersion, pk=version_id, product=product)

        if seo.published_at is not None:
            snapshot = {
                **_live_content_dict(seo),
                "score_overall": seo.score_overall,
                "seo_issues": seo.seo_issues,  # Include SEO issues in snapshot
                "score_breakdown": seo.score_breakdown,
            }
            SEOVersion.objects.create(
                product=product,
                version_number=_next_version_number(product),
                reason=SEOVersion.Reason.PRE_RESTORE,
                snapshot=snapshot,
                created_by=request.user,
            )

        content = {field: version.snapshot.get(field) for field in CONTENT_FIELDS}
        score = annotate_fixable(score_seo_content(product, content))

        for field in CONTENT_FIELDS:
            setattr(seo, field, content[field])
        seo.score_overall = score["overall"]
        seo.score_breakdown = score["breakdown"]
        seo.seo_issues = score["issues"]  # Store SEO issues
        seo.is_optimized = score["is_optimized"]
        seo.published_at = timezone.now()
        seo.last_published_by = request.user
        seo.save()

        return Response({
            "detail": f"Restored version {version.version_number}.",
            "live": content,
            "live_score": score,
        })


class SEODashboardView(JWTAdminMixin, APIView):
    """GET /api/admin/seo/dashboard — aggregate SEO score dashboard."""

    def get(self, request):
        total_products = Product.objects.count()
        seo_rows = ProductSEO.objects.filter(published_at__isnull=False)
        products_with_seo = seo_rows.count()
        products_never_generated = total_products - ProductSEO.objects.count()

        average_score = seo_rows.aggregate(avg=Avg("score_overall"))["avg"] or 0
        optimized_count = seo_rows.filter(is_optimized=True).count()

        # Indexed status approximation (products that are active and have published SEO)
        indexed_count = ProductSEO.objects.filter(
            product__is_active=True,
            published_at__isnull=False
        ).count()

        # Last updated (most recent SEO update)
        latest_seo_update = seo_rows.order_by('-updated_at').first()
        last_updated = latest_seo_update.updated_at.isoformat() if latest_seo_update else None

        # Crawl date (most recent crawl)
        latest_crawled = seo_rows.exclude(last_crawled__isnull=True).order_by('-last_crawled').first()
        crawl_date = latest_crawled.last_crawled.isoformat() if latest_crawled else None

        # Canonical status approximation (check if product has meaningful data)
        # In a real implementation, this would check for proper canonical tags
        canonical_ready_count = seo_rows.exclude(
            Q(seo_title__exact='') | Q(meta_description__exact='')
        ).count()

        # Schema status (check if any schema fields are populated)
        schema_enabled_count = seo_rows.filter(
            Q(product_schema__isnull=False) &
            ~Q(product_schema={}) |
            Q(faq_schema__isnull=False) &
            ~Q(faq_schema={}) |
            Q(breadcrumb_schema__isnull=False) &
            ~Q(breadcrumb_schema={}) |
            Q(organization_schema__isnull=False) &
            ~Q(organization_schema={})
        ).count()

        buckets = {"0-59": 0, "60-79": 0, "80-89": 0, "90-100": 0}
        dimension_totals: dict[str, list[int]] = {}
        # Issue tracking
        issue_counts = {}
        issue_severity_counts = {"high": 0, "medium": 0, "low": 0, "info": 0}

        for score_overall, breakdown, issues_json in seo_rows.values_list("score_overall", "score_breakdown", "seo_issues"):
            if score_overall < 60:
                buckets["0-59"] += 1
            elif score_overall < 80:
                buckets["60-79"] += 1
            elif score_overall < 90:
                buckets["80-89"] += 1
            else:
                buckets["90-100"] += 1

            for dimension, value in (breakdown or {}).items():
                dimension_totals.setdefault(dimension, []).append(value)

            # Process issues
            if issues_json:
                for issue in issues_json:
                    issue_id = issue.get("id", "unknown")
                    issue_name = issue.get("name", "Unknown Issue")
                    severity = issue.get("severity", "medium")

                    # Count issue occurrences
                    issue_counts[issue_id] = issue_counts.get(issue_id, 0) + 1

                    # Count by severity
                    if severity in issue_severity_counts:
                        issue_severity_counts[severity] += 1

        dimension_averages = {
            dimension: round(sum(values) / len(values), 1)
            for dimension, values in dimension_totals.items()
        }

        # Get top issues (most common)
        top_issues = []
        for issue_id, count in issue_counts.items():
            # We would need to get the issue name from a sample issue
            # For now, we'll use the ID as name or fetch from a sample
            issue_name = issue_id.replace("_", " ").title()  # Fallback
            top_issues.append({"issue_id": issue_id, "issue_name": issue_name, "count": count})

        # Sort by count descending and take top 10
        top_issues.sort(key=lambda x: x["count"], reverse=True)
        top_issues = top_issues[:10]

        top_products = list(
            seo_rows.select_related("product")
            .order_by("-score_overall")[:10]
            .values("product_id", "product__name", "score_overall")
        )
        lowest_products = list(
            seo_rows.select_related("product")
            .order_by("score_overall")[:10]
            .values("product_id", "product__name", "score_overall")
        )
        # Last updated (most recent SEO update)
        latest_seo_update = seo_rows.order_by('-updated_at').first()
        last_updated = latest_seo_update.updated_at.isoformat() if latest_seo_update else None

        # Crawl date (most recent crawl)
        latest_crawled = seo_rows.exclude(last_crawled__isnull=True).order_by('-last_crawled').first()
        crawl_date = latest_crawled.last_crawled.isoformat() if latest_crawled else None

        recently_generated = list(
            ProductSEO.objects.filter(generated_at__isnull=False)
            .select_related("product")
            .order_by("-generated_at")[:10]
            .values("product_id", "product__name", "generated_at", "score_overall", "published_at")
        )

        return Response({
            "total_products": total_products,
            "products_with_seo": products_with_seo,
            "products_never_generated": products_never_generated,
            "average_score": round(average_score, 1),
            "optimized_count": optimized_count,
            "indexed_count": seo_rows.filter(indexed=True).count(),
            "last_updated": last_updated,
            "crawl_date": crawl_date,
            "canonical_ready_count": seo_rows.exclude(canonical_url='').count(),
            "schema_enabled_count": seo_rows.filter(schema_score__gt=0).count(),
            "score_distribution": buckets,
            "dimension_averages": dimension_averages,
            "top_products": top_products,
            "lowest_products": lowest_products,
            "recently_generated": recently_generated,
            "issue_counts": issue_counts,
            "top_issues": top_issues,
            "issue_severity_distribution": issue_severity_counts,
        })


# ── Bulk regeneration (Phase 2) ─────────────────────────────────────────────

class SEOBulkStartView(JWTAdminMixin, APIView):
    """
    POST /api/admin/seo/bulk/start

    Body: {"scope": "all" | "category" | "never_generated" | "low_score", "category_id"?: number}

    Queues a SEORegenerationJob per matching active product. Jobs only ever
    write ProductSEO.draft — nothing is published automatically.
    """

    def post(self, request):
        scope = request.data.get("scope", "all")
        category_id = request.data.get("category_id")

        products_qs = Product.objects.filter(is_active=True)

        if scope == "category":
            if not category_id:
                return Response(
                    {"detail": "category_id is required for scope='category'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            products_qs = products_qs.filter(category_id=category_id)
        elif scope == "never_generated":
            products_qs = products_qs.filter(
                Q(seo__isnull=True) | Q(seo__generated_at__isnull=True)
            )
        elif scope == "low_score":
            products_qs = products_qs.filter(
                Q(seo__isnull=True) | Q(seo__score_overall__lt=90)
            )
        elif scope != "all":
            return Response(
                {"detail": f"Unknown scope '{scope}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = enqueue_seo_bulk_jobs(products_qs.distinct(), requested_by=request.user)
        return Response(result)


class SEOBulkStatusView(JWTAdminMixin, APIView):
    """
    GET /api/admin/seo/bulk/status?batch_id=... — defaults to the most recent batch.
    """

    def get(self, request):
        batch_id = request.query_params.get("batch_id")

        if not batch_id:
            latest = SEORegenerationJob.objects.order_by("-created_at").first()
            if not latest:
                return Response({
                    "batch_id": None, "total": 0,
                    "pending": 0, "processing": 0, "completed": 0, "failed": 0,
                    "percent_complete": 0, "is_running": False,
                    "started_at": None, "recent": [],
                })
            batch_id = latest.batch_id

        jobs = SEORegenerationJob.objects.filter(batch_id=batch_id)
        total = jobs.count()

        if total == 0:
            return Response(
                {"detail": f"No SEO bulk jobs found for batch_id '{batch_id}'."},
                status=status.HTTP_404_NOT_FOUND,
            )

        counts = {
            "pending": jobs.filter(status=SEORegenerationJob.Status.PENDING).count(),
            "processing": jobs.filter(status=SEORegenerationJob.Status.PROCESSING).count(),
            "completed": jobs.filter(status=SEORegenerationJob.Status.COMPLETED).count(),
            "failed": jobs.filter(status=SEORegenerationJob.Status.FAILED).count(),
        }
        done = counts["completed"] + counts["failed"]
        percent_complete = round((done / total) * 100) if total else 0
        is_running = (counts["pending"] + counts["processing"]) > 0
        started_at = jobs.order_by("created_at").values_list("created_at", flat=True).first()

        recent = list(
            jobs.select_related("product")
            .order_by("-updated_at")[:15]
            .values("product_id", "product__name", "status", "result_score", "last_error", "completed_at")
        )

        return Response({
            "batch_id": batch_id,
            "total": total,
            **counts,
            "percent_complete": percent_complete,
            "is_running": is_running,
            "started_at": started_at,
            "recent": recent,
        })


class SEOBulkBatchesView(JWTAdminMixin, APIView):
    """GET /api/admin/seo/bulk/batches — 20 most recent bulk runs, newest first."""

    def get(self, request):
        batches = list(
            SEORegenerationJob.objects.values("batch_id")
            .annotate(
                total=Count("id"),
                pending=Count("id", filter=Q(status=SEORegenerationJob.Status.PENDING)),
                processing=Count("id", filter=Q(status=SEORegenerationJob.Status.PROCESSING)),
                completed=Count("id", filter=Q(status=SEORegenerationJob.Status.COMPLETED)),
                failed=Count("id", filter=Q(status=SEORegenerationJob.Status.FAILED)),
                started_at=Min("created_at"),
                last_activity_at=Max("updated_at"),
            )
            .order_by("-started_at")[:20]
        )
        return Response(batches)


class SEOBulkRetryFailedView(JWTAdminMixin, APIView):
    """
    POST /api/admin/seo/bulk/retry-failed

    Body: {"batch_id"?: string} — resets matching FAILED jobs back to PENDING.
    """

    def post(self, request):
        batch_id = request.data.get("batch_id")

        failed_qs = SEORegenerationJob.objects.filter(status=SEORegenerationJob.Status.FAILED)
        if batch_id:
            failed_qs = failed_qs.filter(batch_id=batch_id)

        count = failed_qs.count()
        if count == 0:
            return Response({"detail": "No failed SEO jobs to retry.", "retried": 0})

        failed_qs.update(
            status=SEORegenerationJob.Status.PENDING,
            attempts=0,
            next_attempt_at=timezone.now(),
            last_error="",
        )
        return Response({"detail": f"Requeued {count} failed SEO job(s).", "retried": count})
