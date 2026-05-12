"""
Durable background job orchestration for Google Sheets inventory sync.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

from products.models import InventoryItem, InventorySyncJob, StandaloneInventoryItem, SyncLog
from products.sheets_service import (
    SyncRecord,
    get_sheets_service,
    get_sheets_service_state,
    serialize_inventory_item,
    serialize_standalone_item,
)

logger = logging.getLogger("products.sync")

DEFAULT_RETRY_MINUTES = (1, 5, 15, 30, 60)


def enqueue_standalone_upsert(item, *, triggered_by="signal", requested_by=None):
    return _create_or_merge_item_job(
        scope=InventorySyncJob.Scope.STANDALONE,
        operation=InventorySyncJob.Operation.UPSERT,
        item_key=item.sku,
        payload=serialize_standalone_item(item),
        triggered_by=triggered_by,
        requested_by=requested_by,
    )


def enqueue_inventory_upsert(item, *, triggered_by="signal", requested_by=None):
    return _create_or_merge_item_job(
        scope=InventorySyncJob.Scope.PRODUCT,
        operation=InventorySyncJob.Operation.UPSERT,
        item_key=item.sku,
        payload=serialize_inventory_item(item),
        triggered_by=triggered_by,
        requested_by=requested_by,
    )


def enqueue_standalone_delete(item, *, triggered_by="signal", requested_by=None):
    return _create_or_merge_item_job(
        scope=InventorySyncJob.Scope.STANDALONE,
        operation=InventorySyncJob.Operation.DELETE,
        item_key=item.sku,
        payload={"sku": item.sku},
        triggered_by=triggered_by,
        requested_by=requested_by,
    )


def enqueue_inventory_delete(item, *, triggered_by="signal", requested_by=None):
    return _create_or_merge_item_job(
        scope=InventorySyncJob.Scope.PRODUCT,
        operation=InventorySyncJob.Operation.DELETE,
        item_key=item.sku,
        payload={"sku": item.sku},
        triggered_by=triggered_by,
        requested_by=requested_by,
    )


def enqueue_standalone_batch_upsert(items, *, triggered_by="bulk_import", requested_by=None):
    records = {item.sku: serialize_standalone_item(item) for item in items}
    return InventorySyncJob.objects.create(
        scope=InventorySyncJob.Scope.STANDALONE,
        operation=InventorySyncJob.Operation.BATCH_UPSERT,
        triggered_by=triggered_by,
        requested_by=requested_by,
        payload={"records": list(records.values())},
    )


def enqueue_full_sync(*, triggered_by="manual", requested_by=None):
    existing = InventorySyncJob.objects.filter(
        scope=InventorySyncJob.Scope.SYSTEM,
        operation=InventorySyncJob.Operation.FULL_SYNC,
        status__in=[
            InventorySyncJob.JobStatus.PENDING,
            InventorySyncJob.JobStatus.RETRY,
            InventorySyncJob.JobStatus.PROCESSING,
        ],
    ).order_by("-created_at").first()
    if existing:
        if requested_by is not None:
            existing.requested_by = requested_by
            existing.save(update_fields=["requested_by", "updated_at"])
        return existing

    return InventorySyncJob.objects.create(
        scope=InventorySyncJob.Scope.SYSTEM,
        operation=InventorySyncJob.Operation.FULL_SYNC,
        triggered_by=triggered_by,
        requested_by=requested_by,
        item_key="system",
        payload={},
    )


def process_pending_sync_jobs(batch_size: int = 25) -> dict:
    claimed_jobs = _claim_sync_jobs(batch_size=batch_size)
    summary = {"processed": 0, "success": 0, "failed": 0, "retry": 0, "skipped": 0}

    for job in claimed_jobs:
        summary["processed"] += 1
        result = _process_job(job)
        summary[result] += 1

    return summary


def background_sync_standalone(item, action: str = "save", triggered_by="signal", requested_by=None):
    if action == "delete":
        return enqueue_standalone_delete(item, triggered_by=triggered_by, requested_by=requested_by)
    return enqueue_standalone_upsert(item, triggered_by=triggered_by, requested_by=requested_by)


def background_sync_inventory(item, action: str = "save", triggered_by="signal", requested_by=None):
    if action == "delete":
        return enqueue_inventory_delete(item, triggered_by=triggered_by, requested_by=requested_by)
    return enqueue_inventory_upsert(item, triggered_by=triggered_by, requested_by=requested_by)


def background_full_sync(triggered_by: str = "manual", requested_by=None):
    return enqueue_full_sync(triggered_by=triggered_by, requested_by=requested_by)


def _create_or_merge_item_job(
    *,
    scope: str,
    operation: str,
    item_key: str,
    payload: dict,
    triggered_by: str,
    requested_by=None,
):
    existing = InventorySyncJob.objects.filter(
        scope=scope,
        item_key=item_key,
        status__in=[
            InventorySyncJob.JobStatus.PENDING,
            InventorySyncJob.JobStatus.RETRY,
        ],
    ).order_by("-created_at").first()

    if existing:
        existing.operation = operation
        existing.payload = payload
        existing.triggered_by = triggered_by
        existing.requested_by = requested_by
        existing.status = InventorySyncJob.JobStatus.PENDING
        existing.next_attempt_at = timezone.now()
        existing.last_error = ""
        existing.save(
            update_fields=[
                "operation",
                "payload",
                "triggered_by",
                "requested_by",
                "status",
                "next_attempt_at",
                "last_error",
                "updated_at",
            ]
        )
        return existing

    return InventorySyncJob.objects.create(
        scope=scope,
        operation=operation,
        item_key=item_key,
        payload=payload,
        triggered_by=triggered_by,
        requested_by=requested_by,
    )


def _claim_sync_jobs(batch_size: int) -> list[InventorySyncJob]:
    now = timezone.now()
    claimed = []

    with transaction.atomic():
        queryset = InventorySyncJob.objects.filter(
            status__in=[
                InventorySyncJob.JobStatus.PENDING,
                InventorySyncJob.JobStatus.RETRY,
            ],
            next_attempt_at__lte=now,
        ).order_by("created_at")

        if connection.features.has_select_for_update:
            if connection.features.has_select_for_update_skip_locked:
                queryset = queryset.select_for_update(skip_locked=True)
            else:
                queryset = queryset.select_for_update()

        jobs = list(queryset[:batch_size])

        for job in jobs:
            job.status = InventorySyncJob.JobStatus.PROCESSING
            job.started_at = now
            job.attempts += 1
            job.save(update_fields=["status", "started_at", "attempts", "updated_at"])
            claimed.append(job)

    return claimed


def _process_job(job: InventorySyncJob) -> str:
    state = get_sheets_service_state()
    if not state.enabled:
        _complete_job(
            job,
            status=InventorySyncJob.JobStatus.SKIPPED,
            log_status=SyncLog.SyncStatus.SKIPPED,
            items_synced=0,
            error_message="Google Sheets sync is disabled.",
            row_map={},
        )
        return "skipped"

    service = get_sheets_service()
    if not service:
        return _retry_or_fail(
            job,
            "Google Sheets service is unavailable. Check credentials and spreadsheet configuration.",
        )

    try:
        items_synced, row_map = _dispatch_job(job, service)
    except Exception as exc:
        logger.exception(
            "[Sheets] Inventory sync job %s FAILED | scope=%s operation=%s sku=%s",
            job.id, job.scope, job.operation, job.item_key,
        )
        return _retry_or_fail(job, str(exc))

    _complete_job(
        job,
        status=InventorySyncJob.JobStatus.SUCCESS,
        log_status=SyncLog.SyncStatus.SUCCESS,
        items_synced=items_synced,
        error_message="",
        row_map=row_map,
    )
    return "success"


def _dispatch_job(job: InventorySyncJob, service) -> tuple[int, dict[str, int]]:
    if job.operation == InventorySyncJob.Operation.UPSERT:
        record = SyncRecord.from_payload(job.payload)
        tab = _tab_name_for_scope(job.scope)
        count, row_map = service.sync_records(tab, [record])
        return count, row_map

    if job.operation == InventorySyncJob.Operation.BATCH_UPSERT:
        records = [SyncRecord.from_payload(p) for p in job.payload.get("records", [])]
        tab = _tab_name_for_scope(job.scope)
        count, row_map = service.sync_records(tab, records)
        return count, row_map

    if job.operation == InventorySyncJob.Operation.DELETE:
        sku = job.payload.get("sku") or job.item_key
        service.remove_row(_tab_name_for_scope(job.scope), sku)
        return 1, {}

    if job.operation == InventorySyncJob.Operation.FULL_SYNC:
        standalone_records = [
            SyncRecord.from_payload(serialize_standalone_item(item))
            for item in StandaloneInventoryItem.objects.order_by("name")
        ]
        product_records = [
            SyncRecord.from_payload(serialize_inventory_item(item))
            for item in InventoryItem.objects.select_related("product__category").order_by("product__name")
        ]
        standalone_count, standalone_row_map = service.full_replace_tab(
            settings.GOOGLE_SHEETS_STANDALONE_TAB,
            standalone_records,
        )
        product_count, product_row_map = service.full_replace_tab(
            settings.GOOGLE_SHEETS_INVENTORY_TAB,
            product_records,
        )
        # Write row IDs back to DB for both model types
        _write_back_row_ids_standalone(standalone_row_map)
        _write_back_row_ids_inventory(product_row_map)
        return standalone_count + product_count, {}

    raise ValueError(f"Unsupported inventory sync operation '{job.operation}'")


# ── Sync metadata write-back ──────────────────────────────────────────────────

def _write_back_sync_metadata_standalone(sku: str, row_map: dict[str, int], success: bool):
    """Write synced_at, sync_status, google_sheet_row_id back to the DB record."""
    try:
        item = StandaloneInventoryItem.objects.filter(sku=sku).first()
        if not item:
            return
        item.synced_at = timezone.now()
        item.sync_status = "success" if success else "failure"
        row_num = row_map.get(sku)
        if row_num:
            item.google_sheet_row_id = row_num
        item.save(update_fields=["synced_at", "sync_status", "google_sheet_row_id"])
        logger.info(
            "[Sheets] Metadata written back | SKU=%s synced_at=%s row=%s",
            sku, item.synced_at, item.google_sheet_row_id,
        )
    except Exception:
        logger.warning("[Sheets] Failed to write sync metadata back for SKU=%s", sku, exc_info=True)


def _write_back_sync_metadata_inventory(sku: str, row_map: dict[str, int], success: bool):
    """Write synced_at, sync_status, google_sheet_row_id back to InventoryItem."""
    try:
        item = InventoryItem.objects.filter(sku=sku).first()
        if not item:
            return
        item.synced_at = timezone.now()
        item.sync_status = "success" if success else "failure"
        row_num = row_map.get(sku)
        if row_num:
            item.google_sheet_row_id = row_num
        item.save(update_fields=["synced_at", "sync_status", "google_sheet_row_id"])
        logger.info(
            "[Sheets] Metadata written back | SKU=%s synced_at=%s row=%s",
            sku, item.synced_at, item.google_sheet_row_id,
        )
    except Exception:
        logger.warning("[Sheets] Failed to write sync metadata back for SKU=%s", sku, exc_info=True)


def _write_back_row_ids_standalone(row_map: dict[str, int]):
    """Bulk update google_sheet_row_id for all standalone items in a full sync."""
    if not row_map:
        return
    for sku, row_num in row_map.items():
        try:
            StandaloneInventoryItem.objects.filter(sku=sku).update(
                synced_at=timezone.now(),
                sync_status="success",
                google_sheet_row_id=row_num,
            )
        except Exception:
            logger.warning("[Sheets] Failed to bulk write row ID for SKU=%s", sku, exc_info=True)


def _write_back_row_ids_inventory(row_map: dict[str, int]):
    """Bulk update google_sheet_row_id for all inventory items in a full sync."""
    if not row_map:
        return
    for sku, row_num in row_map.items():
        try:
            InventoryItem.objects.filter(sku=sku).update(
                synced_at=timezone.now(),
                sync_status="success",
                google_sheet_row_id=row_num,
            )
        except Exception:
            logger.warning("[Sheets] Failed to bulk write row ID for SKU=%s", sku, exc_info=True)


# ── Job completion ─────────────────────────────────────────────────────────────

def _retry_or_fail(job: InventorySyncJob, error_message: str) -> str:
    error_message = error_message[:1000]
    if job.attempts >= job.max_attempts:
        _complete_job(
            job,
            status=InventorySyncJob.JobStatus.FAILED,
            log_status=SyncLog.SyncStatus.FAILURE,
            items_synced=0,
            error_message=error_message,
            row_map={},
        )
        return "failed"

    delay_minutes = DEFAULT_RETRY_MINUTES[min(job.attempts - 1, len(DEFAULT_RETRY_MINUTES) - 1)]
    job.status = InventorySyncJob.JobStatus.RETRY
    job.last_error = error_message
    job.next_attempt_at = timezone.now() + timedelta(minutes=delay_minutes)
    job.completed_at = None
    job.save(update_fields=["status", "last_error", "next_attempt_at", "completed_at", "updated_at"])

    SyncLog.objects.create(
        sync_type=_sync_type_for_job(job),
        status=SyncLog.SyncStatus.FAILURE,
        items_synced=0,
        error_message=error_message,
        started_at=job.started_at or timezone.now(),
        completed_at=timezone.now(),
        triggered_by=job.triggered_by,
    )
    return "retry"


def _complete_job(
    job: InventorySyncJob,
    *,
    status: str,
    log_status: str,
    items_synced: int,
    error_message: str,
    row_map: dict[str, int],
):
    completed_at = timezone.now()
    job.status = status
    job.completed_at = completed_at
    job.last_error = error_message
    job.save(update_fields=["status", "completed_at", "last_error", "updated_at"])

    SyncLog.objects.create(
        sync_type=_sync_type_for_job(job),
        status=log_status,
        items_synced=items_synced,
        error_message=error_message,
        started_at=job.started_at or completed_at,
        completed_at=completed_at,
        triggered_by=job.triggered_by,
    )

    # Write sync metadata back to inventory items after success
    if status == InventorySyncJob.JobStatus.SUCCESS:
        success = log_status == SyncLog.SyncStatus.SUCCESS
        
        if job.scope == InventorySyncJob.Scope.STANDALONE:
            if job.operation == InventorySyncJob.Operation.BATCH_UPSERT:
                skus = [r.get("sku") for r in job.payload.get("records", []) if r.get("sku")]
                for sku in skus:
                    _write_back_sync_metadata_standalone(sku, row_map, success)
            elif job.operation == InventorySyncJob.Operation.UPSERT and job.item_key:
                _write_back_sync_metadata_standalone(job.item_key, row_map, success)
                
        elif job.scope == InventorySyncJob.Scope.PRODUCT:
            if job.operation == InventorySyncJob.Operation.BATCH_UPSERT:
                skus = [r.get("sku") for r in job.payload.get("records", []) if r.get("sku")]
                for sku in skus:
                    _write_back_sync_metadata_inventory(sku, row_map, success)
            elif job.operation == InventorySyncJob.Operation.UPSERT and job.item_key:
                _write_back_sync_metadata_inventory(job.item_key, row_map, success)


def _tab_name_for_scope(scope: str) -> str:
    if scope == InventorySyncJob.Scope.STANDALONE:
        return settings.GOOGLE_SHEETS_STANDALONE_TAB
    if scope == InventorySyncJob.Scope.PRODUCT:
        return settings.GOOGLE_SHEETS_INVENTORY_TAB
    raise ValueError(f"Unsupported inventory sync scope '{scope}'")


def _sync_type_for_job(job: InventorySyncJob) -> str:
    if job.operation == InventorySyncJob.Operation.FULL_SYNC:
        return SyncLog.SyncType.FULL
    if job.operation == InventorySyncJob.Operation.DELETE:
        return SyncLog.SyncType.DELETE
    return SyncLog.SyncType.INCREMENTAL
