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


# ── AI SEO Optimizer (Phase 1: single-product pipeline) ──────────────────────

class ProductSEO(models.Model):
    """
    AI-generated SEO content for a single product.

    Live fields are first-class columns (cheap dashboard aggregation);
    `draft` holds the full pending candidate as a single JSON blob until
    it is explicitly applied. Never touches Product.slug/id/name/description.
    """

    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name="seo",
    )

    # ── Live (published) content ──────────────────────────────────────────
    seo_title = models.CharField(max_length=300, blank=True, default="")
    meta_description = models.CharField(max_length=500, blank=True, default="")
    focus_keyword = models.CharField(max_length=200, blank=True, default="")
    secondary_keywords = models.JSONField(blank=True, default=list)
    long_tail_keywords = models.JSONField(blank=True, default=list)
    introduction = models.TextField(blank=True, default="")
    features = models.JSONField(blank=True, default=list)
    benefits = models.JSONField(blank=True, default=list)
    technical_specifications = models.JSONField(blank=True, default=dict)
    applications = models.JSONField(blank=True, default=list)
    industries_served = models.JSONField(blank=True, default=list)
    delivery_locations = models.JSONField(blank=True, default=list)
    faqs = models.JSONField(blank=True, default=list)  # [{question, answer}]
    cta_text = models.TextField(blank=True, default="")
    internal_links = models.JSONField(blank=True, default=list)  # [{anchor_text, url}]
    product_schema = models.JSONField(blank=True, default=dict)
    faq_schema = models.JSONField(blank=True, default=dict)
    breadcrumb_schema = models.JSONField(blank=True, default=dict)
    organization_schema = models.JSONField(blank=True, default=dict)
    image_seo_filename = models.CharField(max_length=255, blank=True, default="")
    image_alt_text = models.CharField(max_length=255, blank=True, default="")
    image_title = models.CharField(max_length=255, blank=True, default="")
    image_caption = models.CharField(max_length=500, blank=True, default="")
    image_description = models.TextField(blank=True, default="")

    # ── Scoring (of the live content) ───────────────────────────────────────
    score_overall = models.PositiveSmallIntegerField(default=0, db_index=True)
    score_breakdown = models.JSONField(blank=True, default=dict)
    seo_issues = models.JSONField(blank=True, default=list)  # New field for SEO audit issues
    is_optimized = models.BooleanField(default=False, db_index=True)

    # ── Pending draft (unpublished candidate) ────────────────────────────────
    draft = models.JSONField(null=True, blank=True, default=None)

    # ── Aud ─────────────────────────────────────────────────────────────────────────
    # Search engine indexing and performance metrics
    indexed = models.BooleanField(default=False, help_text="Whether the page is indexed by search engines")
    last_crawled = models.DateTimeField(null=True, blank=True, help_text="When search engines last crawled the page")
    canonical_url = models.URLField(blank=True, help_text="Canonical URL for SEO purposes")
    schema_score = models.PositiveSmallIntegerField(default=0, help_text="Score indicating completeness/validity of schema markup (0-100)")

    # ── Audit / metadata ──────────────────────────────────────────────────
    ai_model_used = models.CharField(max_length=100, blank=True, default="")
    ai_generation_meta = models.JSONField(blank=True, default=dict)
    generated_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_generated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="seo_drafts_generated",
    )
    last_published_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="seo_drafts_published",
    )
    # SEO tracking fields for dashboard
    indexed = models.BooleanField(default=False, help_text="Whether the page is indexed by search engines")
    last_crawled = models.DateTimeField(null=True, blank=True, help_text="When search engines last crawled the page")
    canonical_url = models.URLField(blank=True, default="", help_text="Canonical URL for the page")
    schema_score = models.PositiveSmallIntegerField(default=0, help_text="Score representing schema completeness and validity (0-100)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["score_overall"]),
            models.Index(fields=["published_at"]),
        ]

    def __str__(self):
        return f"SEO for {self.product.name}"


class SEOVersion(models.Model):
    """
    Immutable snapshot of a product's previous LIVE SEO state, taken right
    before it gets overwritten (on Apply or on Restore), so every change
    is reversible.
    """

    class Reason(models.TextChoices):
        PRE_APPLY = "pre_apply", "Before Apply"
        PRE_RESTORE = "pre_restore", "Before Restore"

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="seo_versions",
    )
    version_number = models.PositiveIntegerField()
    reason = models.CharField(max_length=20, choices=Reason.choices)
    snapshot = models.JSONField()
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="seo_versions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product", "-created_at"]),
        ]

    def __str__(self):
        return f"SEO v{self.version_number} [{self.get_reason_display()}] — {self.product.name}"


class SEORegenerationJob(models.Model):
    """
    Durable background job queue for bulk AI SEO draft generation.

    Mirrors InventorySyncJob's "no Celery/Redis" polling-worker pattern.
    Only ever writes ProductSEO.draft — never touches live SEO content or
    any Product field, so a bulk run can never publish unreviewed content.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="seo_jobs",
    )
    batch_id = models.CharField(max_length=40, db_index=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True,
    )
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=3)
    next_attempt_at = models.DateTimeField(default=timezone.now, db_index=True)
    last_error = models.TextField(blank=True, default="")
    result_score = models.PositiveSmallIntegerField(null=True, blank=True)
    requested_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="seo_bulk_jobs",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["batch_id", "status"]),
            models.Index(fields=["status", "next_attempt_at"]),
        ]

    def __str__(self):
        return f"SEO bulk job [{self.get_status_display()}] {self.product.name} (batch {self.batch_id})"


# ── Image Protection & Watermark Management ──────────────────────────────────

class ImageProtectionSettings(models.Model):
    """
    Global, admin-editable configuration for image protection & watermarking.

    Manually-enforced singleton (pk is always 1) — no django-solo dependency
    in this repo, so `save()` pins the pk itself. All toggles default to
    False so enabling this system never surprises a live production site;
    an admin must explicitly turn each protection on.
    """

    class WatermarkPosition(models.TextChoices):
        CENTER = "center", "Centered (single)"
        TILED = "tiled", "Repeated diagonal pattern"

    # ── Global protection toggles (Feature 1) ─────────────────────────────
    watermark_enabled = models.BooleanField(default=False)
    right_click_protection_enabled = models.BooleanField(default=False)
    drag_protection_enabled = models.BooleanField(default=False)
    long_press_protection_enabled = models.BooleanField(default=False)
    seo_metadata_protection_enabled = models.BooleanField(default=False)

    # ── Watermark design (Feature 3 & 9) ──────────────────────────────────
    watermark_text = models.CharField(
        max_length=200, default="FINSTAR INDUSTRIAL SYSTEMS LTD",
    )
    watermark_secondary_text = models.CharField(
        max_length=200, default="www.finstarsystems.co.ke",
    )
    watermark_opacity = models.PositiveSmallIntegerField(
        default=20, help_text="Percent opacity (1-100). Recommended: 15-25.",
    )
    watermark_font_size = models.PositiveSmallIntegerField(
        default=48, help_text="Base font size in px, scaled by Cloudinary per image.",
    )
    watermark_angle = models.SmallIntegerField(
        default=-45, help_text="Rotation angle in degrees (-90 to 90).",
    )
    watermark_position = models.CharField(
        max_length=20,
        choices=WatermarkPosition.choices,
        default=WatermarkPosition.TILED,
    )

    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="image_protection_settings_updates",
    )

    class Meta:
        verbose_name = "Image protection settings"
        verbose_name_plural = "Image protection settings"

    def __str__(self):
        return "Image Protection Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # singleton — never deletable

    @classmethod
    def get_solo(cls) -> "ImageProtectionSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class ProductImageProtection(models.Model):
    """
    Per-product watermark application state.

    Kept as a separate OneToOne table (not a Product field) so the Product
    model — and therefore existing slugs/URLs/migrations — never changes.
    The original Product.image_url is NEVER modified by this system.
    """

    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name="image_protection",
    )
    is_watermark_applied = models.BooleanField(default=False, db_index=True)
    watermark_applied_at = models.DateTimeField(null=True, blank=True)
    last_restored_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        state = "watermarked" if self.is_watermark_applied else "original"
        return f"{self.product.name} — {state}"


class WatermarkJob(models.Model):
    """
    Durable background job queue for bulk watermark application.

    Field-for-field mirror of SEORegenerationJob's "no Celery/Redis"
    polling-worker pattern. Never touches Product.image_url — only flips
    ProductImageProtection.is_watermark_applied and (optionally) pre-warms
    the Cloudinary CDN cache for the transformed URL.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="watermark_jobs",
    )
    batch_id = models.CharField(max_length=40, db_index=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True,
    )
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=3)
    next_attempt_at = models.DateTimeField(default=timezone.now, db_index=True)
    last_error = models.TextField(blank=True, default="")
    requested_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="watermark_bulk_jobs",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["batch_id", "status"]),
            models.Index(fields=["status", "next_attempt_at"]),
        ]

    def __str__(self):
        return f"Watermark job [{self.get_status_display()}] {self.product.name} (batch {self.batch_id})"


class WatermarkBulkControl(models.Model):
    """
    Pause/resume/cancel control row for a watermark bulk batch.

    The worker's claim query checks this row before claiming jobs for a
    batch_id — a primitive the SEO bulk system doesn't need but this one
    does (Feature 2 requires Pause/Resume/Cancel).
    """

    batch_id = models.CharField(max_length=40, unique=True, db_index=True)
    is_paused = models.BooleanField(default=False)
    is_cancelled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.is_cancelled:
            state = "cancelled"
        elif self.is_paused:
            state = "paused"
        else:
            state = "running"
        return f"Watermark batch {self.batch_id} [{state}]"


class ImageProtectionAuditLog(models.Model):
    """Security/audit log for Feature 11 — tracks every protection-related action."""

    class Action(models.TextChoices):
        SETTINGS_CHANGED = "settings_changed", "Settings Changed"
        WATERMARK_APPLIED = "watermark_applied", "Watermark Applied"
        WATERMARK_REMOVED = "watermark_removed", "Watermark Removed"
        BULK_STARTED = "bulk_started", "Bulk Job Started"
        BULK_PAUSED = "bulk_paused", "Bulk Job Paused"
        BULK_RESUMED = "bulk_resumed", "Bulk Job Resumed"
        BULK_CANCELLED = "bulk_cancelled", "Bulk Job Cancelled"
        RESTORE_SINGLE = "restore_single", "Single Product Restored"
        RESTORE_ALL = "restore_all", "All Products Restored"

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="image_protection_audit_entries",
    )
    action = models.CharField(max_length=30, choices=Action.choices, db_index=True)
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="image_protection_audit_entries",
    )
    details = models.JSONField(blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "-created_at"]),
        ]

    def __str__(self):
        target = self.product.name if self.product else "global"
        return f"[{self.get_action_display()}] {target}"
