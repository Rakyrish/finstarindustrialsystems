"""
Standalone Inventory views for FINSTAR.

These views handle inventory items imported from FINSTAR CSV files.
Unlike the product-linked InventoryItem, StandaloneInventoryItem
stores items by name + section without requiring a Product FK.

Endpoints (via DefaultRouter + custom actions):
  GET    /api/admin/standalone-inventory/                — list all items
  POST   /api/admin/standalone-inventory/                — create item
  GET    /api/admin/standalone-inventory/{id}/           — retrieve item
  PUT    /api/admin/standalone-inventory/{id}/           — full update
  PATCH  /api/admin/standalone-inventory/{id}/           — partial update
  DELETE /api/admin/standalone-inventory/{id}/           — delete item
  POST   /api/admin/standalone-inventory/{id}/adjust/    — manual stock adjustment
  GET    /api/admin/standalone-inventory/{id}/movements/ — movement history
  POST   /api/admin/standalone-inventory/bulk-import/    — bulk CSV import (upsert)
"""

import logging
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import F, Q
from rest_framework import serializers as drf_serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import StandaloneInventoryItem, StandaloneInventoryMovement
from .schema_state import column_exists
from .serializers import (
    StandaloneInventoryItemSerializer,
    StandaloneInventoryMovementSerializer,
)

logger = logging.getLogger("products")


# ── Shared auth mixin ─────────────────────────────────────────────────────────

class JWTAdminMixin:
    """Enforce JWT authentication + IsAdminUser on any view that inherits it."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]


# ── Inline serializer for the adjust action ───────────────────────────────────

class StandaloneStockAdjustSerializer(drf_serializers.Serializer):
    quantity = drf_serializers.IntegerField(
        help_text="Units to add (positive) or remove (negative). E.g. 5 or -3."
    )
    movement_type = drf_serializers.ChoiceField(
        choices=StandaloneInventoryMovement.MovementType.choices,
        default=StandaloneInventoryMovement.MovementType.ADJUSTMENT,
    )
    notes = drf_serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Optional reason / note for this adjustment.",
    )

    def validate_quantity(self, value):
        if value == 0:
            raise drf_serializers.ValidationError("Quantity must be non-zero.")
        return value


# ── Bulk import serializer ────────────────────────────────────────────────────

class BulkImportItemSerializer(drf_serializers.Serializer):
    """Validates a single item from the CSV bulk import payload."""
    name = drf_serializers.CharField(max_length=300)
    section = drf_serializers.CharField(max_length=100, default="Uncategorised")
    qty = drf_serializers.IntegerField(min_value=0, default=0)
    unit = drf_serializers.CharField(max_length=30, default="unit", required=False)
    costPrice = drf_serializers.FloatField(min_value=0, default=0)
    sellPrice = drf_serializers.FloatField(min_value=0, default=0)
    reorderLevel = drf_serializers.IntegerField(min_value=0, default=5)


# ── Main viewset ──────────────────────────────────────────────────────────────

class StandaloneInventoryViewSet(JWTAdminMixin, viewsets.ModelViewSet):
    """
    Standard CRUD for StandaloneInventoryItem, plus custom actions:
      - adjust      (POST /{id}/adjust/)
      - movements   (GET  /{id}/movements/)
      - bulk_import (POST /bulk-import/)
    """
    serializer_class = StandaloneInventoryItemSerializer

    def list(self, request, *args, **kwargs):
        if not column_exists("products_standaloneinventoryitem", "sku"):
            return Response(
                {
                    "detail": (
                        "Inventory schema update required. Run the latest Django migrations "
                        "for the backend before using standalone inventory."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        qs = StandaloneInventoryItem.objects.all()

        status_filter = self.request.query_params.get("status")
        section = self.request.query_params.get("section")
        search = self.request.query_params.get("search")

        if status_filter == "low_stock":
            qs = qs.filter(
                quantity_in_stock__gt=0,
                quantity_in_stock__lte=F("reorder_level"),
            )
        elif status_filter == "out_of_stock":
            qs = qs.filter(quantity_in_stock=0)
        elif status_filter == "in_stock":
            qs = qs.filter(quantity_in_stock__gt=F("reorder_level"))

        if section and section != "all":
            qs = qs.filter(section=section)

        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(section__icontains=search)
            )

        return qs

    # Disable pagination for this viewset — return plain list
    pagination_class = None

    def perform_create(self, serializer):
        inventory_item = serializer.save()
        if inventory_item.quantity_in_stock > 0:
            StandaloneInventoryMovement.objects.create(
                inventory_item=inventory_item,
                movement_type=StandaloneInventoryMovement.MovementType.INITIAL,
                quantity_delta=inventory_item.quantity_in_stock,
                quantity_before=0,
                quantity_after=inventory_item.quantity_in_stock,
                notes="Item created from inventory dashboard",
                performed_by=self.request.user,
            )

    def perform_update(self, serializer):
        inventory_item = serializer.instance
        quantity_before = inventory_item.quantity_in_stock
        updated_item = serializer.save()
        quantity_after = updated_item.quantity_in_stock

        if quantity_after != quantity_before:
            StandaloneInventoryMovement.objects.create(
                inventory_item=updated_item,
                movement_type=StandaloneInventoryMovement.MovementType.ADJUSTMENT,
                quantity_delta=quantity_after - quantity_before,
                quantity_before=quantity_before,
                quantity_after=quantity_after,
                notes="Direct inventory quantity edit from dashboard",
                performed_by=self.request.user,
            )

    # ── POST /api/admin/standalone-inventory/{id}/adjust/ ─────────────────

    @action(detail=True, methods=["post"], url_path="adjust")
    def adjust(self, request, pk=None):
        """
        Manually adjust stock for a standalone inventory item.

        Request body:
            {
              "quantity": 10,
              "movement_type": "restock",
              "notes": "Received shipment"
            }
        """
        inventory_item = self.get_object()
        serializer = StandaloneStockAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quantity_delta = serializer.validated_data["quantity"]
        movement_type = serializer.validated_data["movement_type"]
        notes = serializer.validated_data["notes"]

        quantity_before = inventory_item.quantity_in_stock

        # Guard: cannot deduct more than what's in stock
        if quantity_delta < 0 and abs(quantity_delta) > quantity_before:
            return Response(
                {
                    "detail": (
                        f"Cannot deduct {abs(quantity_delta)} units — "
                        f"only {quantity_before} in stock."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        quantity_after = quantity_before + quantity_delta

        # Persist new stock count
        inventory_item.quantity_in_stock = quantity_after
        inventory_item.save(update_fields=["quantity_in_stock", "updated_at"])

        # Write audit trail
        movement = StandaloneInventoryMovement.objects.create(
            inventory_item=inventory_item,
            movement_type=movement_type,
            quantity_delta=quantity_delta,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            notes=notes,
            performed_by=request.user,
        )

        logger.info(
            "StandaloneStockMovement(%s) by user_id=%s for item=%s: %d → %d",
            movement_type,
            request.user.id,
            inventory_item.name,
            quantity_before,
            quantity_after,
        )

        return Response(
            {
                "detail": "Stock updated successfully.",
                "item_name": inventory_item.name,
                "quantity_before": quantity_before,
                "quantity_after": quantity_after,
                "movement_id": movement.id,
            },
            status=status.HTTP_200_OK,
        )

    # ── GET /api/admin/standalone-inventory/{id}/movements/ ───────────────

    @action(detail=True, methods=["get"], url_path="movements")
    def movements(self, request, pk=None):
        """Return the full movement history for a single inventory item."""
        inventory_item = self.get_object()
        qs = (
            inventory_item.movements
            .select_related("performed_by")
            .order_by("-created_at")
        )
        serializer = StandaloneInventoryMovementSerializer(qs, many=True)
        return Response(serializer.data)

    # ── POST /api/admin/standalone-inventory/bulk-import/ ─────────────────

    @action(detail=False, methods=["post"], url_path="bulk-import")
    def bulk_import(self, request):
        """
        Bulk import inventory items from parsed CSV data.

        Expects a JSON body:
            {
              "items": [
                {"name": "GATE VALVE", "section": "Section A", "qty": 10, ...},
                ...
              ]
            }

        Uses upsert logic: existing items (matched by name + section)
        are updated; new items are created.
        """
        items_data = request.data.get("items", [])
        if not isinstance(items_data, list) or not items_data:
            return Response(
                {"detail": "Request body must include a non-empty 'items' array."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate each item
        serializer = BulkImportItemSerializer(data=items_data, many=True)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        created_count = 0
        updated_count = 0
        errors = []
        synced_items = []

        with transaction.atomic():
            for idx, item_data in enumerate(validated):
                name = item_data["name"].strip().upper()
                section = item_data.get("section", "Uncategorised").strip()
                if not section:
                    section = "Uncategorised"
                unit = item_data.get("unit", "unit").strip() or "unit"

                try:
                    cost_price = Decimal(str(item_data.get("costPrice", 0)))
                    sell_price = Decimal(str(item_data.get("sellPrice", 0)))
                except (InvalidOperation, ValueError):
                    cost_price = Decimal("0")
                    sell_price = Decimal("0")

                qty = max(0, int(item_data.get("qty", 0)))
                reorder_level = max(0, int(item_data.get("reorderLevel", 5)))

                try:
                    obj = (
                        StandaloneInventoryItem.objects
                        .filter(name=name, section=section)
                        .first()
                    )
                    created = obj is None

                    if created:
                        obj = StandaloneInventoryItem(
                            name=name,
                            section=section,
                            unit=unit,
                            quantity_in_stock=qty,
                            cost_price=cost_price,
                            sell_price=sell_price,
                            reorder_level=reorder_level,
                        )
                        quantity_before = 0
                    else:
                        quantity_before = obj.quantity_in_stock
                        obj.unit = unit
                        obj.quantity_in_stock = qty
                        obj.cost_price = cost_price
                        obj.sell_price = sell_price
                        obj.reorder_level = reorder_level

                    obj._skip_sheet_sync = True
                    obj._skip_low_stock_alert = True
                    obj.save()

                    if created:
                        created_count += 1
                        if qty > 0:
                            StandaloneInventoryMovement.objects.create(
                                inventory_item=obj,
                                movement_type=StandaloneInventoryMovement.MovementType.INITIAL,
                                quantity_delta=qty,
                                quantity_before=0,
                                quantity_after=qty,
                                notes="Initial quantity from CSV bulk import",
                                performed_by=request.user,
                            )
                    else:
                        updated_count += 1
                        if quantity_before != qty:
                            StandaloneInventoryMovement.objects.create(
                                inventory_item=obj,
                                movement_type=StandaloneInventoryMovement.MovementType.IMPORT,
                                quantity_delta=qty - quantity_before,
                                quantity_before=quantity_before,
                                quantity_after=qty,
                                notes="Quantity updated from CSV bulk import",
                                performed_by=request.user,
                            )
                    synced_items.append(obj)
                except Exception as exc:
                    errors.append({"row": idx, "name": name, "error": str(exc)})

        logger.info(
            "Bulk import by user_id=%s: %d created, %d updated, %d errors",
            request.user.id,
            created_count,
            updated_count,
            len(errors),
        )

        if synced_items:
            try:
                from .services.inventory_sync import enqueue_standalone_batch_upsert
                items_for_sync = synced_items[:]
                transaction.on_commit(
                    lambda: enqueue_standalone_batch_upsert(
                        items_for_sync,
                        triggered_by="bulk_import",
                        requested_by=request.user,
                    )
                )
                logger.info(
                    "[Sheets] Queued batch sync for %d imported standalone items by user_id=%s",
                    len(items_for_sync),
                    request.user.id,
                )
            except Exception as exc:
                logger.error("[Sheets] Failed to queue batch sync after bulk import: %s", exc)

        resp = {
            "detail": f"Import complete: {created_count} created, {updated_count} updated.",
            "created": created_count,
            "updated": updated_count,
            "total": created_count + updated_count,
        }
        if errors:
            resp["errors"] = errors

        return Response(resp, status=status.HTTP_200_OK)
