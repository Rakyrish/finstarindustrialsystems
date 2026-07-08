"""
DRF Serializers for FINSTAR API.
"""

from urllib.parse import urlparse

from rest_framework import serializers
from .models import (
    Category,
    ImageProtectionAuditLog,
    ImageProtectionSettings,
    Inquiry,
    InventoryItem,
    Product,
    ProductImageProtection,
    ProductSEO,
    SEOVersion,
    StandaloneInventoryItem,
    StandaloneInventoryMovement,
    StockMovement,
)
from .watermark_service import get_effective_image_url


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
    image_url = serializers.SerializerMethodField()

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

    def get_image_url(self, obj):
        """Returns the watermarked URL when protection is enabled + applied, else the original."""
        return get_effective_image_url(obj)


class ProductListSerializer(serializers.ModelSerializer):
    """Lighter serializer for product list view (omits full description)."""

    category = CategorySerializer(read_only=True)
    image_url = serializers.SerializerMethodField()

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

    def get_image_url(self, obj):
        return get_effective_image_url(obj)


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
    watermark_applied = serializers.SerializerMethodField()

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
            "watermark_applied",
            "is_active",
            "featured",
            "specs",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "category"]

    def get_watermark_applied(self, obj):
        try:
            return obj.image_protection.is_watermark_applied
        except ProductImageProtection.DoesNotExist:
            return False
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
            'synced_at', 'sync_status', 'google_sheet_row_id',
        ]
        read_only_fields = [
            'last_updated', 'stock_status', 'margin_percent',
            'synced_at', 'sync_status', 'google_sheet_row_id',
        ]


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


class StandaloneInventoryItemSerializer(serializers.ModelSerializer):
    stock_status = serializers.ReadOnlyField()
    margin_percent = serializers.ReadOnlyField()

    class Meta:
        model = StandaloneInventoryItem
        fields = [
            "id",
            "name",
            "sku",
            "section",
            "unit",
            "quantity_in_stock",
            "cost_price",
            "sell_price",
            "reorder_level",
            "stock_status",
            "margin_percent",
            "created_at",
            "updated_at",
            "synced_at",
            "sync_status",
            "google_sheet_row_id",
        ]
        read_only_fields = [
            "id", "sku", "stock_status", "margin_percent",
            "created_at", "updated_at",
            "synced_at", "sync_status", "google_sheet_row_id",
        ]

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Item name is required.")
        return value.strip().upper()

    def validate_section(self, value):
        value = value.strip()
        return value or "Uncategorised"

    def validate_unit(self, value):
        value = value.strip()
        return value or "unit"


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


# ── SEO ─────────────────────────────────────────────────────────────────────

class SEOProductSummarySerializer(serializers.ModelSerializer):
    """Minimal, read-only product context for the SEO Optimizer workspace."""

    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "image_url", "category"]
        read_only_fields = fields


class SEOVersionSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, default=None
    )
    score_overall_at_snapshot = serializers.SerializerMethodField()

    class Meta:
        model = SEOVersion
        fields = [
            "id",
            "version_number",
            "reason",
            "created_by_username",
            "created_at",
            "score_overall_at_snapshot",
        ]
        read_only_fields = fields

    def get_score_overall_at_snapshot(self, obj):
        return (obj.snapshot or {}).get("score_overall", 0)


# ── Image Protection & Watermark Management ───────────────────────────────

class ImageProtectionSettingsSerializer(serializers.ModelSerializer):
    updated_by_username = serializers.CharField(
        source="updated_by.username", read_only=True, default=None
    )

    class Meta:
        model = ImageProtectionSettings
        fields = [
            "watermark_enabled",
            "right_click_protection_enabled",
            "drag_protection_enabled",
            "long_press_protection_enabled",
            "seo_metadata_protection_enabled",
            "watermark_text",
            "watermark_secondary_text",
            "watermark_opacity",
            "watermark_font_size",
            "watermark_angle",
            "watermark_position",
            "updated_at",
            "updated_by_username",
        ]
        read_only_fields = ["updated_at", "updated_by_username"]

    def validate_watermark_opacity(self, value):
        if not (1 <= value <= 100):
            raise serializers.ValidationError("Opacity must be between 1 and 100.")
        return value

    def validate_watermark_angle(self, value):
        if not (-90 <= value <= 90):
            raise serializers.ValidationError("Angle must be between -90 and 90.")
        return value


class PublicImageProtectionSettingsSerializer(serializers.ModelSerializer):
    """Only the toggles the public site needs to know about — no watermark design details."""

    class Meta:
        model = ImageProtectionSettings
        fields = [
            "watermark_enabled",
            "right_click_protection_enabled",
            "drag_protection_enabled",
            "long_press_protection_enabled",
        ]


class ImageProtectionAuditLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True, default=None)
    action_display = serializers.CharField(source="get_action_display", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True, default=None)

    class Meta:
        model = ImageProtectionAuditLog
        fields = [
            "id",
            "user_username",
            "action",
            "action_display",
            "product_id",
            "product_name",
            "details",
            "created_at",
        ]
        read_only_fields = fields
