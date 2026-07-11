"""
Durable background job orchestration for bulk AI SEO draft generation.

Mirrors services/inventory_sync.py's "no Celery/Redis" polling-queue pattern.
By default every job only ever writes ProductSEO.draft — never live SEO
content, never any Product field — so a bulk run can never publish
unreviewed content to a live, indexed page. A human must still Apply each
draft from /admin/seo, unless the batch was started with auto_publish=True,
in which case each job additionally publishes itself live IF AND ONLY IF it
clears seo_publish_service.blocks_auto_publish() — see that module and
SEORegenerationJob's docstring for the exact rule.
"""

from __future__ import annotations

import logging
import uuid
from datetime import timedelta

from django.db import connection, transaction
from django.utils import timezone

from products.ai_service import AIServiceError
from products.models import Product, ProductSEO, SEORegenerationJob
from products.seo_ai_service import CONTENT_FIELDS, REQUIRED_KEYS, generate_seo_content
from products.seo_fix_service import annotate_fixable
from products.seo_publish_service import blocks_auto_publish, publish_content
from products.seo_schema_builder import build_all_schemas
from products.seo_scoring import score_seo_content

logger = logging.getLogger("products.seo")

DEFAULT_RETRY_MINUTES = (2, 10, 30)


def enqueue_seo_bulk_jobs(products_qs, *, requested_by=None, auto_publish: bool = False) -> dict:
    """
    Create one SEORegenerationJob per product in `products_qs`, skipping any
    product that already has a pending/processing job. Returns a summary
    dict with the shared batch_id for progress polling.
    """
    batch_id = uuid.uuid4().hex

    in_flight_product_ids = set(
        SEORegenerationJob.objects.filter(
            product__in=products_qs,
            status__in=[SEORegenerationJob.Status.PENDING, SEORegenerationJob.Status.PROCESSING],
        ).values_list("product_id", flat=True)
    )

    jobs = [
        SEORegenerationJob(product=product, batch_id=batch_id, requested_by=requested_by, auto_publish=auto_publish)
        for product in products_qs
        if product.id not in in_flight_product_ids
    ]
    SEORegenerationJob.objects.bulk_create(jobs)

    total_matched = products_qs.count()
    return {
        "batch_id": batch_id,
        "queued_count": len(jobs),
        "skipped_count": total_matched - len(jobs),
        "total_matched": total_matched,
    }


def process_pending_seo_jobs(batch_size: int = 20) -> dict:
    claimed_jobs = _claim_seo_jobs(batch_size=batch_size)
    summary = {"processed": 0, "completed": 0, "failed": 0, "retried": 0}

    for job in claimed_jobs:
        summary["processed"] += 1
        result = _process_seo_job(job)
        summary[result] += 1

    return summary


def _claim_seo_jobs(batch_size: int) -> list[SEORegenerationJob]:
    now = timezone.now()
    claimed = []

    with transaction.atomic():
        queryset = SEORegenerationJob.objects.select_related("product", "product__category").filter(
            status=SEORegenerationJob.Status.PENDING,
            next_attempt_at__lte=now,
        ).order_by("created_at")

        if connection.features.has_select_for_update:
            if connection.features.has_select_for_update_skip_locked:
                queryset = queryset.select_for_update(skip_locked=True)
            else:
                queryset = queryset.select_for_update()

        jobs = list(queryset[:batch_size])

        for job in jobs:
            job.status = SEORegenerationJob.Status.PROCESSING
            job.started_at = now
            job.attempts += 1
            job.save(update_fields=["status", "started_at", "attempts", "updated_at"])
            claimed.append(job)

    return claimed


def _process_seo_job(job: SEORegenerationJob) -> str:
    product: Product = job.product

    try:
        ai_data = generate_seo_content(product)
    except AIServiceError as exc:
        logger.warning(
            "[SEO bulk] Job %s FAILED (AI error) | product_id=%s: %s",
            job.id, product.id, exc,
        )
        return _retry_or_fail(job, str(exc))
    except Exception as exc:
        logger.exception(
            "[SEO bulk] Job %s FAILED (unexpected) | product_id=%s", job.id, product.id,
        )
        return _retry_or_fail(job, str(exc))

    schemas = build_all_schemas(product, ai_data)
    content = {key: ai_data[key] for key in REQUIRED_KEYS}
    content["internal_links"] = ai_data["internal_links"]
    content.update(schemas)

    score = annotate_fixable(score_seo_content(product, content))

    seo, _ = ProductSEO.objects.get_or_create(product=product)
    seo.draft = {**content, "score": score}
    seo.generated_at = timezone.now()
    seo.last_generated_by = job.requested_by
    seo.ai_model_used = ai_data.get("_ai_model_used", "")
    seo.save(update_fields=[
        "draft", "generated_at", "last_generated_by", "ai_model_used", "updated_at",
    ])

    job.status = SEORegenerationJob.Status.COMPLETED
    job.completed_at = timezone.now()
    job.result_score = score["overall"]
    job.last_error = ""

    if job.auto_publish:
        block_reason = blocks_auto_publish(score)
        if block_reason:
            job.published = False
            job.publish_block_reason = block_reason
        else:
            publish_content(product, seo, content, score, job.requested_by, CONTENT_FIELDS)
            job.published = True
            job.publish_block_reason = ""

    job.save(update_fields=[
        "status", "completed_at", "result_score", "last_error",
        "published", "publish_block_reason", "updated_at",
    ])

    return "completed"


def _retry_or_fail(job: SEORegenerationJob, error_message: str) -> str:
    error_message = error_message[:1000]

    if job.attempts >= job.max_attempts:
        job.status = SEORegenerationJob.Status.FAILED
        job.last_error = error_message
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "last_error", "completed_at", "updated_at"])
        return "failed"

    delay_minutes = DEFAULT_RETRY_MINUTES[min(job.attempts - 1, len(DEFAULT_RETRY_MINUTES) - 1)]
    job.status = SEORegenerationJob.Status.PENDING
    job.last_error = error_message
    job.next_attempt_at = timezone.now() + timedelta(minutes=delay_minutes)
    job.completed_at = None
    job.save(update_fields=["status", "last_error", "next_attempt_at", "completed_at", "updated_at"])
    return "retried"
