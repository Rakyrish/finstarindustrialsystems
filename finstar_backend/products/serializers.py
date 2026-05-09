"""
DRF Serializers for FINSTAR API.
"""

from urllib.parse import urlparse

from rest_framework import serializers
from .models import Category, Product, Inquiry, InventoryItem


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category with computed product_count."""

    product_count = serializers.IntegerField(
        read_only=True,
        source="product_count_annotated",
        default=0,
    )

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "icon", "product_count"]
        extra_kwargs = {
            "slug": {"required": False, "allow_blank": True},
            "description": {"required": False},
            "icon": {"required": False},
        }


class ProductSerializer(serializers.ModelSerializer):
    """Serializers for Product with nested category data."""

    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "short_description",
            "category",
            "image_url",
            "is_active",
            "featured",
            "specs",
            "created_at",
            "updated_at",
        ]


class ProductListSerializer(serializers.ModelSerializer):
    """Lighter serializer for product list view (omits full description)."""

    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "short_description",
            "category",
            "image_url",
            "is_active",
            "featured",
            "created_at",
        ]


class AdminCategorySerializer(CategorySerializer):
    class Meta(CategorySerializer.Meta):
        fields = CategorySerializer.Meta.fields


class AdminProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "short_description",
            "category",
            "category_id",
            "image_url",
            "is_active",
            "featured",
            "specs",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "category"]
        extra_kwargs = {
            "slug": {"required": False, "allow_blank": True},
            "short_description": {"required": False},
            "image_url": {"required": False, "allow_blank": True},
            "featured": {"required": False},
            "specs": {"required": False},
            "is_active": {"required": False},
        }

    def validate_image_url(self, value):
        if not value:
            return value

        parsed = urlparse(value)
        if parsed.scheme != "https":
            raise serializers.ValidationError("Image URL must use HTTPS.")

        return value


class AdminInquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inquiry
        fields = [
            "id", "name", "email", "phone", "company",
            "subject", "message", "products", "source_url",
            "email_sent", "created_at",
        ]
        read_only_fields = fields


class InquirySerializer(serializers.ModelSerializer):
    """Serializer for contact form submissions with validation."""

    class Meta:
        model = Inquiry
        fields = [
            "id", "name", "email", "phone", "company",
            "subject", "message", "products", "source_url", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Name must be at least 2 characters.")
        return value.strip()

    def validate_email(self, value):
        if not value or "@" not in value:
            raise serializers.ValidationError("Please provide a valid email address.")
        return value.strip().lower()

    def validate_message(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Message must be at least 10 characters.")
        return value.strip()

    def validate_phone(self, value):
        return value.strip()

    def validate_company(self, value):
        return value.strip()

    def validate_products(self, value):
        """Ensure products is a list of strings (from saved-products feature)."""
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Products must be a list.")
        return [str(item) for item in value if item][:20]  # cap at 20

class InventoryItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)
    category_id = serializers.IntegerField(source='product.category.id', read_only=True)
    stock_status = serializers.ReadOnlyField()
    margin_percent = serializers.ReadOnlyField()
    

    class Meta:
        model = InventoryItem
        fields = [
            'id', 'product', 'product_name', 'category_name', 'category_id',
            'sku', 'unit', 'cost_price', 'unit_price',
            'quantity_in_stock', 'reorder_level',
            'stock_status', 'margin_percent', 'last_updated',
        ]
        read_only_fields = ['last_updated', 'stock_status', 'margin_percent']
# -----------------------------------------------------------------------
# Add StockMovementSerializer to your existing serializers.py.
# Inquiry serializers are UNCHANGED — no product/quantity fields.
# -----------------------------------------------------------------------

from rest_framework import serializers
from .models import StockMovement


class StockMovementSerializer(serializers.ModelSerializer):
    movement_type_display = serializers.CharField(
        source="get_movement_type_display", read_only=True
    )
    performed_by_username = serializers.CharField(
        source="performed_by.username", read_only=True, default=None
    )
    product_name = serializers.CharField(
        source="inventory_item.product.name", read_only=True
    )
    sku = serializers.CharField(
        source="inventory_item.sku", read_only=True
    )

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "sku",
            "product_name",
            "movement_type",
            "movement_type_display",
            "quantity_delta",
            "quantity_before",
            "quantity_after",
            "notes",
            "performed_by_username",
            "created_at",
        ]
        read_only_fields = fields


# ── Standalone Inventory Serializers ──────────────────────────────────────────

from .models import StandaloneInventoryItem, StandaloneInventoryMovement


class StandaloneInventoryItemSerializer(serializers.ModelSerializer):
    stock_status = serializers.ReadOnlyField()
    margin_percent = serializers.ReadOnlyField()

    class Meta:
        model = StandaloneInventoryItem
        fields = [
            "id",
            "name",
            "section",
            "quantity_in_stock",
            "cost_price",
            "sell_price",
            "reorder_level",
            "stock_status",
            "margin_percent",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "stock_status", "margin_percent", "created_at", "updated_at"]

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Item name is required.")
        return value.strip().upper()


class StandaloneInventoryMovementSerializer(serializers.ModelSerializer):
    movement_type_display = serializers.CharField(
        source="get_movement_type_display", read_only=True
    )
    performed_by_username = serializers.CharField(
        source="performed_by.username", read_only=True, default=None
    )
    item_name = serializers.CharField(
        source="inventory_item.name", read_only=True
    )

    class Meta:
        model = StandaloneInventoryMovement
        fields = [
            "id",
            "item_name",
            "movement_type",
            "movement_type_display",
            "quantity_delta",
            "quantity_before",
            "quantity_after",
            "notes",
            "performed_by_username",
            "created_at",
        ]
        read_only_fields = fields