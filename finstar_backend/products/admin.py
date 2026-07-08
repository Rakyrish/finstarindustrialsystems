"""
Django Admin configuration for FINSTAR models.
"""

from django.contrib import admin
from .models import (
    Category, Product, Inquiry, InventoryItem,
    StandaloneInventoryItem, StandaloneInventoryMovement,
    SyncLog, InventorySyncJob, ProductSEO, SEOVersion, SEORegenerationJob,
    ImageProtectionAuditLog, ImageProtectionSettings, ProductImageProtection,
    WatermarkBulkControl, WatermarkJob,
)


# ── StandaloneInventoryItem ───────────────────────────────────────────────────

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
    actions = ['sync_selected_to_sheets', 'sync_all_to_sheets']

    @admin.action(description="📊 Sync selected items to Google Sheets")
    def sync_selected_to_sheets(self, request, queryset):
        from products.services.inventory_sync import enqueue_standalone_upsert

        for item in queryset:
            enqueue_standalone_upsert(item, triggered_by="manual", requested_by=request.user)

        self.message_user(
            request,
            f"Queued Google Sheets sync for {queryset.count()} standalone item(s).",
        )

    @admin.action(description="📊 Full Sync ALL inventory to Google Sheets")
    def sync_all_to_sheets(self, request, queryset):
        from products.services.inventory_sync import enqueue_full_sync

        enqueue_full_sync(triggered_by="manual", requested_by=request.user)
        self.message_user(
            request,
            "Queued a full Google Sheets sync. Check the Sync Logs for status.",
        )


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


# ── InventoryItem (product-linked) ────────────────────────────────────────────

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
    actions = ['sync_selected_to_sheets']

    def category(self, obj):
        return obj.product.category.name if obj.product.category else '—'
    category.short_description = 'Category'

    @admin.action(description="📊 Sync selected items to Google Sheets")
    def sync_selected_to_sheets(self, request, queryset):
        from products.services.inventory_sync import enqueue_inventory_upsert

        for item in queryset:
            enqueue_inventory_upsert(item, triggered_by="manual", requested_by=request.user)

        self.message_user(
            request,
            f"Queued Google Sheets sync for {queryset.count()} product inventory item(s).",
        )


# ── Category ──────────────────────────────────────────────────────────────────

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "product_count")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


# ── Product ───────────────────────────────────────────────────────────────────

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


# ── Inquiry ───────────────────────────────────────────────────────────────────

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


# ── SyncLog (Google Sheets audit trail) ───────────────────────────────────────

@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'sync_type', 'status', 'items_synced',
        'triggered_by', 'duration_display', 'created_at',
    ]
    list_filter = ['status', 'sync_type', 'triggered_by']
    readonly_fields = [
        'sync_type', 'status', 'items_synced', 'error_message',
        'started_at', 'completed_at', 'triggered_by', 'created_at',
        'duration_seconds',
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    def duration_display(self, obj):
        s = obj.duration_seconds
        if s < 1:
            return f"{s*1000:.0f}ms"
        return f"{s:.1f}s"
    duration_display.short_description = "Duration"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(InventorySyncJob)
class InventorySyncJobAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "scope",
        "operation",
        "status",
        "item_key",
        "attempts",
        "triggered_by",
        "next_attempt_at",
        "created_at",
    ]
    list_filter = ["scope", "operation", "status", "triggered_by"]
    search_fields = ["item_key", "last_error"]
    readonly_fields = [
        "scope",
        "operation",
        "status",
        "triggered_by",
        "item_key",
        "payload",
        "attempts",
        "max_attempts",
        "last_error",
        "requested_by",
        "next_attempt_at",
        "started_at",
        "completed_at",
        "created_at",
        "updated_at",
    ]
    ordering = ["created_at"]

    def has_add_permission(self, request):
        return False


# ── AI SEO Optimizer ──────────────────────────────────────────────────────────

@admin.register(ProductSEO)
class ProductSEOAdmin(admin.ModelAdmin):
    list_display = [
        "product", "score_overall", "is_optimized",
        "published_at", "generated_at",
    ]
    list_filter = ["is_optimized"]
    search_fields = ["product__name", "seo_title", "focus_keyword"]
    readonly_fields = [f.name for f in ProductSEO._meta.fields if f.name != "id"]
    ordering = ["-updated_at"]

    def has_add_permission(self, request):
        return False


@admin.register(SEOVersion)
class SEOVersionAdmin(admin.ModelAdmin):
    list_display = ["product", "version_number", "reason", "created_by", "created_at"]
    list_filter = ["reason"]
    search_fields = ["product__name"]
    readonly_fields = [f.name for f in SEOVersion._meta.fields if f.name != "id"]
    ordering = ["-created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SEORegenerationJob)
class SEORegenerationJobAdmin(admin.ModelAdmin):
    list_display = [
        "id", "product", "batch_id", "status",
        "attempts", "result_score", "requested_by", "created_at",
    ]
    list_filter = ["status"]
    search_fields = ["product__name", "batch_id", "last_error"]
    readonly_fields = [f.name for f in SEORegenerationJob._meta.fields if f.name != "id"]
    ordering = ["-created_at"]

    def has_add_permission(self, request):
        return False


# ── Image Protection & Watermark Management ───────────────────────────────────
# Ops visibility only — real control is via the /admin/image-protection and
# /admin/watermark dashboard pages.

@admin.register(ImageProtectionSettings)
class ImageProtectionSettingsAdmin(admin.ModelAdmin):
    list_display = [
        "watermark_enabled", "right_click_protection_enabled",
        "drag_protection_enabled", "long_press_protection_enabled",
        "updated_by", "updated_at",
    ]
    readonly_fields = [f.name for f in ImageProtectionSettings._meta.fields if f.name != "id"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ProductImageProtection)
class ProductImageProtectionAdmin(admin.ModelAdmin):
    list_display = ["product", "is_watermark_applied", "watermark_applied_at", "last_restored_at"]
    list_filter = ["is_watermark_applied"]
    search_fields = ["product__name"]
    readonly_fields = [f.name for f in ProductImageProtection._meta.fields if f.name != "id"]
    ordering = ["-updated_at"]

    def has_add_permission(self, request):
        return False


@admin.register(WatermarkJob)
class WatermarkJobAdmin(admin.ModelAdmin):
    list_display = [
        "id", "product", "batch_id", "status",
        "attempts", "requested_by", "created_at",
    ]
    list_filter = ["status"]
    search_fields = ["product__name", "batch_id", "last_error"]
    readonly_fields = [f.name for f in WatermarkJob._meta.fields if f.name != "id"]
    ordering = ["-created_at"]

    def has_add_permission(self, request):
        return False


@admin.register(WatermarkBulkControl)
class WatermarkBulkControlAdmin(admin.ModelAdmin):
    list_display = ["batch_id", "is_paused", "is_cancelled", "created_at", "updated_at"]
    list_filter = ["is_paused", "is_cancelled"]
    search_fields = ["batch_id"]
    readonly_fields = [f.name for f in WatermarkBulkControl._meta.fields if f.name != "id"]
    ordering = ["-created_at"]

    def has_add_permission(self, request):
        return False


@admin.register(ImageProtectionAuditLog)
class ImageProtectionAuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "product", "user", "created_at"]
    list_filter = ["action"]
    search_fields = ["product__name", "user__username"]
    readonly_fields = [f.name for f in ImageProtectionAuditLog._meta.fields if f.name != "id"]
    ordering = ["-created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
