"""
Durable background job orchestration for bulk watermark application.

Mirrors services/seo_bulk.py's "no Celery/Redis" polling-queue pattern, with
one addition SEO bulk doesn't need: WatermarkBulkControl gives Pause/Resume/
Cancel over an in-flight batch. Jobs never touch Product.image_url — they
only flip ProductImageProtection.is_watermark_applied and pre-warm the
Cloudinary CDN cache for the transformed (watermarked) URL.
"""

from __future__ import annotations

import logging
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import timedelta

import cloudinary.uploader
from django.db import close_old_connections, connection, transaction
from django.db.models import Count, Max, Min, Q
from django.utils import timezone

from products.models import (
    ImageProtectionAuditLog,
    ImageProtectionSettings,
    Product,
    ProductImageProtection,
    WatermarkBulkControl,
    WatermarkJob,
)
from products.watermark_service import build_watermark_transformation, extract_public_id

logger = logging.getLogger("products.watermark")

DEFAULT_RETRY_MINUTES = (2, 10, 30)


def enqueue_watermark_jobs(scope: str, *, category_id=None, requested_by=None) -> dict:
    """
    Create one WatermarkJob per matching active product, skipping any product
    that already has a pending/processing job. Returns a summary dict with
    the shared batch_id for progress polling.
    """
    batch_id = uuid.uuid4().hex

    products_qs = Product.objects.filter(is_active=True)
    if scope == "category":
        if not category_id:
            raise ValueError("category_id is required for scope='category'.")
        products_qs = products_qs.filter(category_id=category_id)
    elif scope == "never_watermarked":
        products_qs = products_qs.filter(
            Q(image_protection__isnull=True) | Q(image_protection__is_watermark_applied=False)
        )
    elif scope != "all":
        raise ValueError(f"Unknown scope '{scope}'.")

    products_qs = products_qs.exclude(image_url="").distinct()

    in_flight_product_ids = set(
        WatermarkJob.objects.filter(
            product__in=products_qs,
            status__in=[WatermarkJob.Status.PENDING, WatermarkJob.Status.PROCESSING],
        ).values_list("product_id", flat=True)
    )

    jobs = [
        WatermarkJob(product=product, batch_id=batch_id, requested_by=requested_by)
        for product in products_qs
        if product.id not in in_flight_product_ids
    ]
    WatermarkJob.objects.bulk_create(jobs)

    if jobs:
        WatermarkBulkControl.objects.get_or_create(batch_id=batch_id)
        ImageProtectionAuditLog.objects.create(
            user=requested_by,
            action=ImageProtectionAuditLog.Action.BULK_STARTED,
            details={"batch_id": batch_id, "scope": scope, "queued_count": len(jobs)},
        )

    total_matched = products_qs.count()
    return {
        "batch_id": batch_id,
        "queued_count": len(jobs),
        "skipped_count": total_matched - len(jobs),
        "total_matched": total_matched,
    }


def process_pending_watermark_jobs(batch_size: int = 50, *, max_workers: int = 8) -> dict:
    claimed_jobs = _claim_watermark_jobs(batch_size=batch_size)
    summary = {"processed": 0, "completed": 0, "failed": 0, "retried": 0}

    if not claimed_jobs:
        return summary

    # Work is Cloudinary-network-bound, not CPU-bound, so a thread pool fans the
    # per-image eager() calls out concurrently. Claim already happens under
    # select_for_update(skip_locked=True) on the main thread, so each claimed
    # job is exclusively owned by this worker — no double-processing.
    worker_count = max(1, min(max_workers, len(claimed_jobs)))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        futures = [executor.submit(_process_job_threadsafe, job) for job in claimed_jobs]
        for future in as_completed(futures):
            summary["processed"] += 1
            summary[future.result()] += 1

    return summary


def _process_job_threadsafe(job: WatermarkJob) -> str:
    """
    Per-thread wrapper so one job's failure can never abort the batch.

    Django DB connections are thread-local, so each worker uses its own
    connection. close_old_connections() resets it at entry and exit so a
    transient DB error in one iteration can't poison the next batch's conn.
    _process_watermark_job already narrows Cloudinary errors to retry/fail,
    so this catches the remaining DB/audit-log failure modes.
    """
    close_old_connections()
    try:
        return _process_watermark_job(job)
    except Exception as exc:
        logger.exception("[Watermark bulk] Uncaught error processing job %s", job.id)
        try:
            job.status = WatermarkJob.Status.FAILED
            job.last_error = str(exc)[:1000]
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "last_error", "completed_at", "updated_at"])
        except Exception:
            logger.exception("[Watermark bulk] Failed to mark job %s as FAILED", job.id)
        return "failed"
    finally:
        close_old_connections()


def _claim_watermark_jobs(batch_size: int) -> list[WatermarkJob]:
    now = timezone.now()
    claimed = []

    paused_or_cancelled_batches = set(
        WatermarkBulkControl.objects.filter(Q(is_paused=True) | Q(is_cancelled=True))
        .values_list("batch_id", flat=True)
    )

    with transaction.atomic():
        queryset = WatermarkJob.objects.select_related("product").filter(
            status=WatermarkJob.Status.PENDING,
            next_attempt_at__lte=now,
        ).exclude(batch_id__in=paused_or_cancelled_batches).order_by("created_at")

        if connection.features.has_select_for_update:
            if connection.features.has_select_for_update_skip_locked:
                queryset = queryset.select_for_update(skip_locked=True)
            else:
                queryset = queryset.select_for_update()

        jobs = list(queryset[:batch_size])

        for job in jobs:
            job.status = WatermarkJob.Status.PROCESSING
            job.started_at = now
            job.attempts += 1
            job.save(update_fields=["status", "started_at", "attempts", "updated_at"])
            claimed.append(job)

    return claimed


def _process_watermark_job(job: WatermarkJob) -> str:
    product: Product = job.product
    settings = ImageProtectionSettings.get_solo()

    public_id = extract_public_id(product.image_url)
    if not public_id:
        return _retry_or_fail(
            job, "Product image is not Cloudinary-hosted; cannot be watermarked.", retryable=False,
        )

    try:
        transformation = build_watermark_transformation(settings)
        cloudinary.uploader.explicit(
            public_id, type="upload", eager=[{"transformation": transformation}], eager_async=False,
        )
    except Exception as exc:
        logger.warning(
            "[Watermark bulk] Job %s FAILED (Cloudinary error) | product_id=%s: %s",
            job.id, product.id, exc,
        )
        return _retry_or_fail(job, str(exc))

    protection, _ = ProductImageProtection.objects.get_or_create(product=product)
    protection.is_watermark_applied = True
    protection.watermark_applied_at = timezone.now()
    protection.save(update_fields=["is_watermark_applied", "watermark_applied_at", "updated_at"])

    ImageProtectionAuditLog.objects.create(
        user=job.requested_by,
        action=ImageProtectionAuditLog.Action.WATERMARK_APPLIED,
        product=product,
        details={"batch_id": job.batch_id, "reason": "bulk_apply"},
    )

    job.status = WatermarkJob.Status.COMPLETED
    job.completed_at = timezone.now()
    job.last_error = ""
    job.save(update_fields=["status", "completed_at", "last_error", "updated_at"])

    return "completed"


def _retry_or_fail(job: WatermarkJob, error_message: str, *, retryable: bool = True) -> str:
    error_message = error_message[:1000]

    if not retryable or job.attempts >= job.max_attempts:
        job.status = WatermarkJob.Status.FAILED
        job.last_error = error_message
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "last_error", "completed_at", "updated_at"])
        return "failed"

    delay_minutes = DEFAULT_RETRY_MINUTES[min(job.attempts - 1, len(DEFAULT_RETRY_MINUTES) - 1)]
    job.status = WatermarkJob.Status.PENDING
    job.last_error = error_message
    job.next_attempt_at = timezone.now() + timedelta(minutes=delay_minutes)
    job.completed_at = None
    job.save(update_fields=["status", "last_error", "next_attempt_at", "completed_at", "updated_at"])
    return "retried"


# ── Pause / Resume / Cancel ───────────────────────────────────────────────

def pause_batch(batch_id: str, *, user=None) -> WatermarkBulkControl:
    control, _ = WatermarkBulkControl.objects.get_or_create(batch_id=batch_id)
    control.is_paused = True
    control.save(update_fields=["is_paused", "updated_at"])
    ImageProtectionAuditLog.objects.create(
        user=user, action=ImageProtectionAuditLog.Action.BULK_PAUSED, details={"batch_id": batch_id},
    )
    return control


def resume_batch(batch_id: str, *, user=None) -> WatermarkBulkControl:
    control, _ = WatermarkBulkControl.objects.get_or_create(batch_id=batch_id)
    control.is_paused = False
    control.save(update_fields=["is_paused", "updated_at"])
    ImageProtectionAuditLog.objects.create(
        user=user, action=ImageProtectionAuditLog.Action.BULK_RESUMED, details={"batch_id": batch_id},
    )
    return control


def cancel_batch(batch_id: str, *, user=None) -> WatermarkBulkControl:
    control, _ = WatermarkBulkControl.objects.get_or_create(batch_id=batch_id)
    control.is_cancelled = True
    control.save(update_fields=["is_cancelled", "updated_at"])

    cancelled_count = WatermarkJob.objects.filter(
        batch_id=batch_id, status=WatermarkJob.Status.PENDING,
    ).update(status=WatermarkJob.Status.CANCELLED, completed_at=timezone.now())

    ImageProtectionAuditLog.objects.create(
        user=user,
        action=ImageProtectionAuditLog.Action.BULK_CANCELLED,
        details={"batch_id": batch_id, "cancelled_count": cancelled_count},
    )
    return control


def get_batch_status(batch_id: str) -> dict | None:
    jobs = WatermarkJob.objects.filter(batch_id=batch_id)
    total = jobs.count()
    if total == 0:
        return None

    counts = {
        "pending": jobs.filter(status=WatermarkJob.Status.PENDING).count(),
        "processing": jobs.filter(status=WatermarkJob.Status.PROCESSING).count(),
        "completed": jobs.filter(status=WatermarkJob.Status.COMPLETED).count(),
        "failed": jobs.filter(status=WatermarkJob.Status.FAILED).count(),
        "cancelled": jobs.filter(status=WatermarkJob.Status.CANCELLED).count(),
    }
    done = counts["completed"] + counts["failed"] + counts["cancelled"]
    percent_complete = round((done / total) * 100) if total else 0
    is_running = (counts["pending"] + counts["processing"]) > 0

    control = WatermarkBulkControl.objects.filter(batch_id=batch_id).first()
    is_paused = bool(control and control.is_paused)
    is_cancelled = bool(control and control.is_cancelled)

    started_at = jobs.order_by("created_at").values_list("created_at", flat=True).first()

    completed_jobs = jobs.filter(
        status=WatermarkJob.Status.COMPLETED, started_at__isnull=False, completed_at__isnull=False,
    )
    durations = [
        (completed_at - started_at_val).total_seconds()
        for started_at_val, completed_at in completed_jobs.values_list("started_at", "completed_at")
    ]
    remaining = counts["pending"] + counts["processing"]
    eta_seconds = None
    if durations and remaining:
        avg_duration = sum(durations) / len(durations)
        eta_seconds = round(avg_duration * remaining)

    recent = list(
        jobs.select_related("product")
        .order_by("-updated_at")[:15]
        .values("product_id", "product__name", "status", "last_error", "completed_at")
    )

    return {
        "batch_id": batch_id,
        "total": total,
        **counts,
        "percent_complete": percent_complete,
        "is_running": is_running,
        "is_paused": is_paused,
        "is_cancelled": is_cancelled,
        "started_at": started_at,
        "eta_seconds": eta_seconds,
        "recent": recent,
    }


def get_recent_batches(limit: int = 20) -> list[dict]:
    return list(
        WatermarkJob.objects.values("batch_id")
        .annotate(
            total=Count("id"),
            pending=Count("id", filter=Q(status=WatermarkJob.Status.PENDING)),
            processing=Count("id", filter=Q(status=WatermarkJob.Status.PROCESSING)),
            completed=Count("id", filter=Q(status=WatermarkJob.Status.COMPLETED)),
            failed=Count("id", filter=Q(status=WatermarkJob.Status.FAILED)),
            cancelled=Count("id", filter=Q(status=WatermarkJob.Status.CANCELLED)),
            started_at=Min("created_at"),
            last_activity_at=Max("updated_at"),
        )
        .order_by("-started_at")[:limit]
    )
