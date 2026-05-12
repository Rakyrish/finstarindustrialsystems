"""
Inventory views for FINSTAR.

Endpoints (via DefaultRouter + custom actions):
  GET    /api/admin/inventory/               — list all items
  POST   /api/admin/inventory/               — create item
  GET    /api/admin/inventory/{id}/          — retrieve item
  PUT    /api/admin/inventory/{id}/          — full update
  PATCH  /api/admin/inventory/{id}/          — partial update
  DELETE /api/admin/inventory/{id}/          — delete item
  POST   /api/admin/inventory/{id}/adjust/   — manual stock adjustment
  GET    /api/admin/inventory/{id}/movements/ — movement history for item
  GET    /api/admin/stock-movements/         — all movements across all items
"""

import logging

from django.db.models import F, Q
from rest_framework import generics, serializers as drf_serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import InventoryItem, StockMovement
from .serializers import InventoryItemSerializer, StockMovementSerializer

logger = logging.getLogger("products")


# ── Shared auth mixin ─────────────────────────────────────────────────────────
# Apply this to every inventory view so JWT is always required,
# regardless of the project-wide DEFAULT_AUTHENTICATION_CLASSES setting.

class JWTAdminMixin:
    """Enforce JWT authentication + IsAdminUser on any view that inherits it."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]


# ── Inline serializer for the adjust action ───────────────────────────────────

class StockAdjustSerializer(drf_serializers.Serializer):
    quantity = drf_serializers.IntegerField(
        help_text="Units to add (positive) or remove (negative). E.g. 5 or -3."
    )
    movement_type = drf_serializers.ChoiceField(
        choices=StockMovement.MovementType.choices,
        default=StockMovement.MovementType.ADJUSTMENT,
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


# ── Main viewset ──────────────────────────────────────────────────────────────

class InventoryItemViewSet(JWTAdminMixin, viewsets.ModelViewSet):
    """
    Standard CRUD for InventoryItem, plus two custom actions:
      - adjust    (POST /{id}/adjust/)
      - movements (GET  /{id}/movements/)
    """
    serializer_class = InventoryItemSerializer

    def get_queryset(self):
        qs = InventoryItem.objects.select_related("product__category").all()

        status_filter = self.request.query_params.get("status")
        category = self.request.query_params.get("category")
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

        if category:
            qs = qs.filter(product__category__id=category)

        if search:
            qs = qs.filter(
                Q(product__name__icontains=search) | Q(sku__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        inventory_item = serializer.save()
        if inventory_item.quantity_in_stock > 0:
            StockMovement.objects.create(
                inventory_item=inventory_item,
                movement_type=StockMovement.MovementType.ADJUSTMENT,
                quantity_delta=inventory_item.quantity_in_stock,
                quantity_before=0,
                quantity_after=inventory_item.quantity_in_stock,
                notes="Initial quantity from inventory dashboard",
                performed_by=self.request.user,
            )

    def perform_update(self, serializer):
        inventory_item = serializer.instance
        quantity_before = inventory_item.quantity_in_stock
        updated_item = serializer.save()
        quantity_after = updated_item.quantity_in_stock

        if quantity_after != quantity_before:
            StockMovement.objects.create(
                inventory_item=updated_item,
                movement_type=StockMovement.MovementType.ADJUSTMENT,
                quantity_delta=quantity_after - quantity_before,
                quantity_before=quantity_before,
                quantity_after=quantity_after,
                notes="Direct quantity edit from inventory dashboard",
                performed_by=self.request.user,
            )

    # ── POST /api/admin/inventory/{id}/adjust/ ────────────────────────────────

    @action(detail=True, methods=["post"], url_path="adjust")
    def adjust(self, request, pk=None):
        """
        Manually adjust stock for an inventory item.

        Request body:
            {
              "quantity": 10,              // positive = add, negative = deduct
              "movement_type": "restock",  // optional, defaults to "adjustment"
              "notes": "Received shipment" // optional
            }
        """
        inventory_item = self.get_object()
        serializer = StockAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quantity_delta = serializer.validated_data["quantity"]
        movement_type  = serializer.validated_data["movement_type"]
        notes          = serializer.validated_data["notes"]

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
        inventory_item.save(update_fields=["quantity_in_stock", "last_updated"])

        # Write audit trail
        movement = StockMovement.objects.create(
            inventory_item=inventory_item,
            movement_type=movement_type,
            quantity_delta=quantity_delta,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            notes=notes,
            performed_by=request.user,
        )

        logger.info(
            "StockMovement(%s) by user_id=%s for sku=%s: %d → %d",
            movement_type,
            request.user.id,
            inventory_item.sku,
            quantity_before,
            quantity_after,
        )

        return Response(
            {
                "detail": "Stock updated successfully.",
                "sku": inventory_item.sku,
                "quantity_before": quantity_before,
                "quantity_after": quantity_after,
                "movement_id": movement.id,
            },
            status=status.HTTP_200_OK,
        )

    # ── GET /api/admin/inventory/{id}/movements/ ──────────────────────────────

    @action(detail=True, methods=["get"], url_path="movements")
    def movements(self, request, pk=None):
        """Return the full movement history for a single inventory item."""
        inventory_item = self.get_object()
        qs = (
            inventory_item.movements
            .select_related("performed_by")
            .order_by("-created_at")
        )
        serializer = StockMovementSerializer(qs, many=True)
        return Response(serializer.data)


# ── GET /api/admin/stock-movements/ ──────────────────────────────────────────

class StockMovementListView(JWTAdminMixin, generics.ListAPIView):
    """All stock movements across every inventory item, newest first."""

    serializer_class = StockMovementSerializer

    def get_queryset(self):
        qs = StockMovement.objects.select_related(
            "inventory_item__product", "performed_by"
        ).order_by("-created_at")

        movement_type = self.request.query_params.get("type")
        if movement_type:
            qs = qs.filter(movement_type=movement_type)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(inventory_item__sku__icontains=search)
                | Q(inventory_item__product__name__icontains=search)
            )

        return qs
