"""
Django signals for FINSTAR inventory automation.

  - Product post_save → auto-create InventoryItem when a new product is added
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import InventoryItem, Product

logger = logging.getLogger("products")


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