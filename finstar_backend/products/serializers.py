"""
DRF Serializers for FINSTAR API.
"""

from urllib.parse import urlparse

from rest_framework import serializers
from .models import Category, Product, Inquiry


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
        fields = ["id", "name", "email", "message", "created_at"]
        read_only_fields = fields


class InquirySerializer(serializers.ModelSerializer):
    """Serializer for contact form submissions with validation."""

    class Meta:
        model = Inquiry
        fields = ["id", "name", "email", "message", "created_at"]
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
