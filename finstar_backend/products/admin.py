"""
Django Admin configuration for FINSTAR models.
"""

from django.contrib import admin
from .models import Category, Product, Inquiry


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "product_count")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_active", "featured", "created_at")
    list_filter = ("category", "is_active", "featured")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}
    list_editable = ("is_active", "featured")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {
            "fields": ("name", "slug", "category", "is_active", "featured"),
        }),
        ("Content", {
            "fields": ("short_description", "description", "image_url", "specs"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "created_at")
    list_filter = ("created_at",)
    search_fields = ("name", "email", "message")
    readonly_fields = ("name", "email", "message", "created_at")
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False  # Inquiries come from the frontend only

    def has_change_permission(self, request, obj=None):
        return False  # Read-only view
