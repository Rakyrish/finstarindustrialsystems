"""
Models for FINSTAR Industrial Systems.

Core models:
  - Category       (product grouping)
  - Product        (individual equipment listing)
  - Inquiry        (contact form submissions — name/email/message only)
  - InventoryItem  (stock record per product)
  - StockMovement  (full audit trail of every stock change)
"""

from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from uuid import uuid4


User = get_user_model()


def generate_unique_slug(model_class, base_value, instance_pk=None):
    slug = slugify(base_value)
    if not slug:
        return slug

    original_slug = slug
    counter = 1

    while model_class.objects.filter(slug=slug).exclude(pk=instance_pk).exists():
        slug = f"{original_slug}-{counter}"
        counter += 1

    return slug


def generate_unique_sku(model_class, prefix="FSI"):
    while True:
        candidate = f"{prefix}-{uuid4().hex[:8].upper()}"
        if not model_class.objects.filter(sku=candidate).exists():
            return candidate


class Category(models.Model):
    """Product category (e.g. Refrigeration, HVAC, Boilers)."""

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, db_index=True)
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=10, blank=True, default="")

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Category, self.name, self.pk)
        super().save(*args, **kwargs)

    @property
    def product_count(self):
        return self.products.count()


class Product(models.Model):
    """Industrial equipment product."""

    name = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True, db_index=True)
    description = models.TextField()
    short_description = models.CharField(max_length=1000, blank=True, default="")
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="products",
        db_index=True,
    )
    image_url = models.URLField(
        max_length=500,
        blank=True,
        default="",
        help_text="External image URL (e.g. Cloudinary)",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    featured = models.BooleanField(default=False, db_index=True)
    specs = models.JSONField(
        blank=True,
        null=True,
        default=dict,
        help_text="Key/value product specifications",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["category", "slug"]),
            models.Index(fields=["is_active", "-created_at"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Product, self.name, self.pk)
        super().save(*args, **kwargs)


class Inquiry(models.Model):
    """
    Contact form submission — purely for messages.
    No product or order logic here.
    """

    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True, default="")
    company = models.CharField(max_length=200, blank=True, default="")
    subject = models.CharField(max_length=200, blank=True, default="")
    message = models.TextField()
    products = models.JSONField(
        blank=True,
        null=True,
        default=list,
        help_text="List of product names the customer tagged/saved",
    )
    source_url = models.URLField(max_length=500, blank=True, default="")
    email_sent = models.BooleanField(default=False, help_text="Set True once Resend emails are dispatched")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "inquiries"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — {self.email}"


class InventoryItem(models.Model):
    """Stock record for a single product."""

    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name="inventory",
    )
    sku = models.CharField(max_length=50, unique=True)
    unit = models.CharField(max_length=30, default="unit")
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity_in_stock = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=2)
    last_updated = models.DateTimeField(auto_now=True)
    # ── Google Sheets sync metadata ───────────────────────────────────────────
    synced_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Timestamp of last successful Google Sheets sync.",
    )
    sync_status = models.CharField(
        max_length=20, blank=True, default="",
        help_text="Last sync result: 'success', 'failure', or empty.",
    )
    google_sheet_row_id = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="1-based row number in the Google Sheet.",
    )

    class Meta:
        ordering = ["product__name"]

    def __str__(self):
        return f"{self.sku} — {self.product.name}"

    @property
    def stock_status(self):
        if self.quantity_in_stock == 0:
            return "out_of_stock"
        if self.quantity_in_stock <= self.reorder_level:
            return "low_stock"
        return "in_stock"

    @property
    def margin_percent(self):
        if self.unit_price > 0 and self.cost_price > 0:
            return round(
                ((self.unit_price - self.cost_price) / self.unit_price) * 100
            )
        return None


class StockMovement(models.Model):
    """
    Immutable audit log of every stock change.

    Positive delta  → stock coming IN  (restock, return, manual add)
    Negative delta  → stock going OUT  (damaged, manual deduct)
    """

    class MovementType(models.TextChoices):
        RESTOCK = "restock", "Restock"
        ADJUSTMENT = "adjustment", "Manual Adjustment"
        DAMAGED = "damaged", "Damaged / Written Off"
        RETURN = "return", "Customer Return"

    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    movement_type = models.CharField(
        max_length=20,
        choices=MovementType.choices,
    )
    # Positive = in, Negative = out
    quantity_delta = models.IntegerField(
        help_text="Positive = stock added, Negative = stock removed",
    )
    quantity_before = models.PositiveIntegerField(
        help_text="Stock level before this movement",
    )
    quantity_after = models.IntegerField(
        help_text="Stock level after this movement",
    )
    notes = models.TextField(blank=True, default="")
    # Who made the change (null = system/signal)
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["inventory_item", "-created_at"]),
        ]

    def __str__(self):
        direction = "+" if self.quantity_delta >= 0 else ""
        return (
            f"{self.get_movement_type_display()} "
            f"{direction}{self.quantity_delta} × {self.inventory_item.sku}"
        )


# ── Standalone Inventory (CSV-driven, no Product FK) ─────────────────────────

class StandaloneInventoryItem(models.Model):
    """
    Inventory item imported directly from FINSTAR CSV.

    Unlike InventoryItem (which requires a Product FK), this model stores
    items by name + section and is purpose-built for the warehouse CSV flow.
    """

    name = models.CharField(max_length=300, db_index=True)
    sku = models.CharField(max_length=64, unique=True, blank=True)
    section = models.CharField(max_length=100, default="Uncategorised")
    unit = models.CharField(max_length=30, default="unit")
    quantity_in_stock = models.PositiveIntegerField(default=0)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sell_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reorder_level = models.PositiveIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # ── Google Sheets sync metadata ───────────────────────────────────────────
    synced_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Timestamp of last successful Google Sheets sync.",
    )
    sync_status = models.CharField(
        max_length=20, blank=True, default="",
        help_text="Last sync result: 'success', 'failure', or empty.",
    )
    google_sheet_row_id = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="1-based row number in the Google Sheet.",
    )

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "section"],
                name="unique_standalone_name_section",
            )
        ]
        indexes = [
            models.Index(fields=["section"]),
            models.Index(fields=["quantity_in_stock"]),
        ]

    def __str__(self):
        return f"{self.sku} — {self.name} ({self.section})"

    def save(self, *args, **kwargs):
        if not self.sku:
            self.sku = generate_unique_sku(StandaloneInventoryItem)
        super().save(*args, **kwargs)

    @property
    def stock_status(self):
        if self.quantity_in_stock == 0:
            return "out_of_stock"
        if self.quantity_in_stock <= self.reorder_level:
            return "low_stock"
        return "in_stock"

    @property
    def margin_percent(self):
        if self.sell_price > 0 and self.cost_price > 0:
            return round(
                ((self.sell_price - self.cost_price) / self.sell_price) * 100
            )
        return None


class StandaloneInventoryMovement(models.Model):
    """Immutable audit log for standalone inventory items."""

    class MovementType(models.TextChoices):
        RESTOCK = "restock", "Restock"
        ADJUSTMENT = "adjustment", "Manual Adjustment"
        DAMAGED = "damaged", "Damaged / Written Off"
        RETURN = "return", "Customer Return"
        SALE = "sale", "Sale / Dispatch"
        TRANSFER = "transfer", "Transfer"
        IMPORT = "import", "CSV Import"
        INITIAL = "initial", "Initial Stock"

    inventory_item = models.ForeignKey(
        StandaloneInventoryItem,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    movement_type = models.CharField(
        max_length=20,
        choices=MovementType.choices,
    )
    quantity_delta = models.IntegerField(
        help_text="Positive = stock added, Negative = stock removed",
    )
    quantity_before = models.PositiveIntegerField(
        help_text="Stock level before this movement",
    )
    quantity_after = models.IntegerField(
        help_text="Stock level after this movement",
    )
    notes = models.TextField(blank=True, default="")
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="standalone_stock_movements",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["inventory_item", "-created_at"]),
        ]

    def __str__(self):
        direction = "+" if self.quantity_delta >= 0 else ""
        return (
            f"{self.get_movement_type_display()} "
            f"{direction}{self.quantity_delta} × {self.inventory_item.name}"
        )


# ── Sync Log (Google Sheets integration audit trail) ──────────────────────────

class SyncLog(models.Model):
    """
    Records every Google Sheets sync attempt.

    Used by the admin dashboard Sync Status panel and the
    /api/admin/sheets/logs endpoint.
    """

    class SyncType(models.TextChoices):
        INCREMENTAL = "incremental", "Incremental Sync"
        FULL = "full", "Full Sync"
        DELETE = "delete", "Row Deletion"

    class SyncStatus(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILURE = "failure", "Failure"
        PARTIAL = "partial", "Partial (some errors)"
        SKIPPED = "skipped", "Skipped (Sheets disabled)"

    class TriggerSource(models.TextChoices):
        SIGNAL = "signal", "Auto (DB Signal)"
        MANUAL = "manual", "Manual (Sync Now)"
        BULK_IMPORT = "bulk_import", "Bulk CSV Import"

    sync_type = models.CharField(
        max_length=20,
        choices=SyncType.choices,
        default=SyncType.INCREMENTAL,
    )
    status = models.CharField(
        max_length=20,
        choices=SyncStatus.choices,
        db_index=True,
    )
    items_synced = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    triggered_by = models.CharField(
        max_length=20,
        choices=TriggerSource.choices,
        default=TriggerSource.SIGNAL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["triggered_by", "-created_at"]),
        ]

    def __str__(self):
        duration = ""
        if self.completed_at and self.started_at:
            delta = self.completed_at - self.started_at
            duration = f" ({delta.total_seconds():.1f}s)"
        return (
            f"[{self.get_status_display()}] {self.get_sync_type_display()} "
            f"— {self.items_synced} item(s){duration}"
        )

    @property
    def duration_seconds(self) -> float:
        if self.completed_at and self.started_at:
            return (self.completed_at - self.started_at).total_seconds()
        return 0.0


class InventorySyncJob(models.Model):
    """Durable background job queue for Google Sheets synchronization."""

    class Scope(models.TextChoices):
        STANDALONE = "standalone", "Standalone Inventory"
        PRODUCT = "product", "Product Inventory"
        SYSTEM = "system", "System-wide"

    class Operation(models.TextChoices):
        UPSERT = "upsert", "Upsert Row"
        BATCH_UPSERT = "batch_upsert", "Batch Upsert Rows"
        DELETE = "delete", "Delete Row"
        FULL_SYNC = "full_sync", "Full Sync"

    class JobStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        RETRY = "retry", "Retry Scheduled"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"
        CANCELLED = "cancelled", "Cancelled"

    scope = models.CharField(max_length=20, choices=Scope.choices)
    operation = models.CharField(max_length=20, choices=Operation.choices)
    status = models.CharField(
        max_length=20,
        choices=JobStatus.choices,
        default=JobStatus.PENDING,
        db_index=True,
    )
    triggered_by = models.CharField(
        max_length=20,
        choices=SyncLog.TriggerSource.choices,
        default=SyncLog.TriggerSource.SIGNAL,
        db_index=True,
    )
    item_key = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Stable spreadsheet row identifier, typically the SKU.",
        db_index=True,
    )
    payload = models.JSONField(blank=True, default=dict)
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)
    last_error = models.TextField(blank=True, default="")
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_sync_jobs",
    )
    next_attempt_at = models.DateTimeField(default=timezone.now, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["status", "next_attempt_at"]),
            models.Index(fields=["scope", "item_key", "status"]),
            models.Index(fields=["triggered_by", "created_at"]),
        ]

    def __str__(self):
        key = self.item_key or self.scope
        return f"{self.get_operation_display()} [{self.get_status_display()}] {key}"
