"""
Django Admin configuration for FINSTAR models.
"""

from django.contrib import admin
from .models import (
    Category, Product, Inquiry, InventoryItem,
    StandaloneInventoryItem, StandaloneInventoryMovement,
)

@admin.register(StandaloneInventoryItem)
class StandaloneInventoryItemAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'section', 'quantity_in_stock', 'cost_price',
        'sell_price', 'reorder_level', 'stock_status', 'updated_at',
    ]
    list_editable = ['quantity_in_stock', 'cost_price', 'sell_price', 'reorder_level']
    list_filter = ['section']
    search_fields = ['name', 'section']
    readonly_fields = ['stock_status', 'margin_percent', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(StandaloneInventoryMovement)
class StandaloneInventoryMovementAdmin(admin.ModelAdmin):
    list_display = [
        'inventory_item', 'movement_type', 'quantity_delta',
        'quantity_before', 'quantity_after', 'performed_by', 'created_at',
    ]
    list_filter = ['movement_type']
    search_fields = ['inventory_item__name', 'notes']
    readonly_fields = ['inventory_item', 'movement_type', 'quantity_delta',
                       'quantity_before', 'quantity_after', 'notes',
                       'performed_by', 'created_at']
    ordering = ['-created_at']



@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = [
        'sku', 'product', 'category', 'unit_price',
        'cost_price', 'quantity_in_stock', 'reorder_level',
        'stock_status', 'last_updated'
    ]
    list_editable = ['unit_price', 'cost_price', 'quantity_in_stock', 'reorder_level']
    list_filter = ['product__category', 'quantity_in_stock']
    search_fields = ['sku', 'product__name']
    readonly_fields = ['stock_status', 'margin_percent', 'last_updated']
    ordering = ['product__name']

    def category(self, obj):
        return obj.product.category.name if obj.product.category else '—'
    category.short_description = 'Category'


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
    list_display = (
        "name", "email", "phone", "company",
        "subject", "email_sent", "created_at",
    )
    list_filter = ("email_sent", "subject", "created_at")
    search_fields = ("name", "email", "company", "message")
    readonly_fields = (
        "name", "email", "phone", "company", "subject",
        "message", "products", "source_url", "email_sent", "created_at",
    )
    date_hierarchy = "created_at"
    fieldsets = (
        ("Customer", {
            "fields": ("name", "email", "phone", "company"),
        }),
        ("Inquiry", {
            "fields": ("subject", "message", "products", "source_url"),
        }),
        ("System", {
            "fields": ("email_sent", "created_at"),
            "classes": ("collapse",),
        }),
    )

    def has_add_permission(self, request):
        return False  # Inquiries come from the frontend only

    def has_change_permission(self, request, obj=None):
        return False  # Read-only view

    actions = ["resend_emails"]

    @admin.action(description="Re-send notification + confirmation emails")
    def resend_emails(self, request, queryset):
        from products.email_service import send_inquiry_emails, EmailPayload
        sent = 0
        for inquiry in queryset:
            payload = EmailPayload(
                name=inquiry.name,
                email=inquiry.email,
                phone=inquiry.phone or "",
                company=inquiry.company or "",
                subject_label=inquiry.subject or "General Inquiry",
                message=inquiry.message,
                products=inquiry.products or [],
                source_url=inquiry.source_url or "",
                inquiry_id=inquiry.pk,
                submitted_at=inquiry.created_at,
            )
            results = send_inquiry_emails(payload)
            if results.get("notification") or results.get("confirmation"):
                inquiry.email_sent = True
                inquiry.save(update_fields=["email_sent"])
                sent += 1
        self.message_user(request, f"Emails re-sent for {sent} of {queryset.count()} inquiries.")
