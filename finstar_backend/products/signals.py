"""
Django signals for FINSTAR inventory automation.

Signals:
  1. Product post_save         → auto-create InventoryItem when a new product is added
  2. StandaloneInventoryItem   → post_save / post_delete → queue Google Sheets sync jobs
  3. InventoryItem             → post_save / post_delete → queue Google Sheets sync jobs
  4. Low-stock alert           → email admin via Resend when qty <= reorder_level after save
"""

import logging

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import InventoryItem, Product, StandaloneInventoryItem

logger = logging.getLogger("products")


# ── 1. Auto-create InventoryItem when a new Product is saved ──────────────────

@receiver(post_save, sender=Product)
def create_inventory_item(sender, instance, created, **kwargs):
    """
    When a new Product is saved, auto-create a matching InventoryItem
    so it immediately appears in the inventory dashboard.
    """
    if created:
        item, was_created = InventoryItem.objects.get_or_create(
            product=instance,
            defaults={
                "sku": f"FSL-{str(instance.id).zfill(4)}",
                "unit": "unit",
            },
        )
        if was_created:
            logger.info(
                "Auto-created InventoryItem sku=%s for product_id=%s",
                item.sku,
                instance.id,
            )


# ── 2. StandaloneInventoryItem → Google Sheets sync ───────────────────────────

@receiver(post_save, sender=StandaloneInventoryItem)
def sync_standalone_to_sheets_on_save(sender, instance, created, **kwargs):
    """
    After a StandaloneInventoryItem is created or updated, queue the row
    for Google Sheets synchronization.
    Also triggers a low-stock email alert if quantity <= reorder_level.
    """
    if not getattr(instance, "_skip_sheet_sync", False):
        try:
            from .services.inventory_sync import enqueue_standalone_upsert
            transaction.on_commit(lambda: enqueue_standalone_upsert(instance))
        except Exception as exc:
            logger.error(
                "Failed to queue Sheets sync for standalone item id=%s: %s",
                instance.id, exc
            )

    # Low-stock alert
    if not getattr(instance, "_skip_low_stock_alert", False):
        _maybe_send_low_stock_alert(
            name=instance.name,
            quantity=instance.quantity_in_stock,
            reorder_level=instance.reorder_level,
            item_id=f"standalone-{instance.id}",
            section=instance.section,
        )


@receiver(post_delete, sender=StandaloneInventoryItem)
def sync_standalone_to_sheets_on_delete(sender, instance, **kwargs):
    """Remove the row from Google Sheets when a standalone item is deleted."""
    try:
        from .services.inventory_sync import enqueue_standalone_delete
        transaction.on_commit(lambda: enqueue_standalone_delete(instance))
    except Exception as exc:
        logger.error(
            "Failed to queue Sheets delete for standalone item id=%s: %s",
            instance.id, exc
        )


# ── 3. InventoryItem (product-linked) → Google Sheets sync ────────────────────

@receiver(post_save, sender=InventoryItem)
def sync_inventory_to_sheets_on_save(sender, instance, created, **kwargs):
    """
    After an InventoryItem is created or updated, queue the row
    for Google Sheets synchronization.
    Also triggers a low-stock email alert if quantity <= reorder_level.
    """
    if not getattr(instance, "_skip_sheet_sync", False):
        try:
            from .services.inventory_sync import enqueue_inventory_upsert
            transaction.on_commit(lambda: enqueue_inventory_upsert(instance))
        except Exception as exc:
            logger.error(
                "Failed to queue Sheets sync for inventory item id=%s: %s",
                instance.id, exc
            )

    # Low-stock alert
    product_name = ""
    try:
        product_name = instance.product.name
    except Exception:
        product_name = instance.sku

    if not getattr(instance, "_skip_low_stock_alert", False):
        _maybe_send_low_stock_alert(
            name=product_name,
            quantity=instance.quantity_in_stock,
            reorder_level=instance.reorder_level,
            item_id=f"inv-{instance.id}",
            section=None,
        )


@receiver(post_delete, sender=InventoryItem)
def sync_inventory_to_sheets_on_delete(sender, instance, **kwargs):
    """Remove the row from Google Sheets when an inventory item is deleted."""
    try:
        from .services.inventory_sync import enqueue_inventory_delete
        transaction.on_commit(lambda: enqueue_inventory_delete(instance))
    except Exception as exc:
        logger.error(
            "Failed to queue Sheets delete for inventory item id=%s: %s",
            instance.id, exc
        )


# ── 4. Low-stock alert helper ─────────────────────────────────────────────────

# Track recently alerted items to avoid email floods (in-memory; resets on restart)
_alerted_items: set = set()


def _maybe_send_low_stock_alert(
    name: str,
    quantity: int,
    reorder_level: int,
    item_id: str,
    section=None,
):
    """
    Send a low-stock email alert if quantity <= reorder_level.
    Uses a simple in-memory set to avoid duplicate alerts per server session.
    """
    if quantity > reorder_level:
        # Stock is fine — remove from alerted set so future low-stock triggers again
        _alerted_items.discard(item_id)
        return

    if item_id in _alerted_items:
        logger.debug("Low-stock alert for %s already sent this session — skipping", item_id)
        return

    _alerted_items.add(item_id)

    import threading

    # def _send():
    #     try:
    #         from .email_service import send_low_stock_alert
    #         send_low_stock_alert(
    #             item_name=name,
    #             quantity=quantity,
    #             reorder_level=reorder_level,
    #             section=section,
    #         )
    #     except Exception as exc:
    #         logger.error(
    #             "Low-stock alert email FAILED for item_id=%s: %s",
    #             item_id, exc, exc_info=True
    #         )

    # threading.Thread(target=_send, daemon=True).start()
