"""
URL routing for FINSTAR products API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .inventory import InventoryItemViewSet, StockMovementListView
from .standalone_inventory import StandaloneInventoryViewSet
from .seo_views import (
    SEOApplyDraftView,
    SEOBulkBatchesView,
    SEOBulkRetryFailedView,
    SEOBulkStartView,
    SEOBulkStatusView,
    SEODashboardView,
    SEOFixIssueView,
    SEOGenerateDraftView,
    SEOProductDetailView,
    SEORestoreVersionView,
    SEOSaveDraftView,
    SEOVersionListView,
)
from .watermark_views import (
    ImageProtectionAuditLogListView,
    ImageProtectionSettingsView,
    PublicImageProtectionSettingsView,
    WatermarkBulkBatchesView,
    WatermarkBulkCancelView,
    WatermarkBulkPauseView,
    WatermarkBulkResumeView,
    WatermarkBulkStartView,
    WatermarkBulkStatusView,
    WatermarkPreviewView,
    WatermarkRestoreAllView,
    WatermarkRestoreView,
)
from .views import (
    AIGenerateProductView,
    AdminCategoryDetailView,
    AdminCategoryListCreateView,
    AdminDashboardOverviewView,
    AdminErrorLogsView,
    AdminImageUploadView,
    AdminInquiryListView,
    AdminProductDetailView,
    AdminProductListCreateView,
    AdminSheetsSyncNowView,
    AdminSheetsSyncStatusView,
    AdminSheetsSyncLogsView,
    AdminSheetsTestConnectionView,
    AdminSheetsRetryFailedView,
    CategoryListView,
    HealthCheckView,
    InquiryCreateView,
    ProductDetailView,
    ProductListView,
    SheetsWebhookView,
    StaffTokenObtainPairView,
)

# ---------------------------------------------------------------------------
# Router — handles /admin/inventory/ and its custom actions:
#   POST  /admin/inventory/{id}/adjust/
#   GET   /admin/inventory/{id}/movements/
# ---------------------------------------------------------------------------
router = DefaultRouter()
router.register(r"admin/inventory", InventoryItemViewSet, basename="admin-inventory")
router.register(r"admin/standalone-inventory", StandaloneInventoryViewSet, basename="admin-standalone-inventory")

# ---------------------------------------------------------------------------
# URL patterns
# ---------------------------------------------------------------------------
urlpatterns = [
    # --- Router (inventory viewset + actions) ---
    path("", include(router.urls)),

    # --- Health ---
    path("health", HealthCheckView.as_view(), name="health"),
    path("health/", HealthCheckView.as_view()),

    # --- Auth ---
    path("auth/token", StaffTokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("auth/token/", StaffTokenObtainPairView.as_view()),
    path("auth/token/refresh", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/token/refresh/", TokenRefreshView.as_view()),

    # --- Public ---
    path("categories", CategoryListView.as_view(), name="category-list"),
    path("categories/", CategoryListView.as_view()),
    path("products", ProductListView.as_view(), name="product-list"),
    path("products/", ProductListView.as_view()),
    path("products/<slug:slug>", ProductDetailView.as_view(), name="product-detail"),
    path("products/<slug:slug>/", ProductDetailView.as_view()),
    path("inquiries", InquiryCreateView.as_view(), name="inquiry-create"),
    path("inquiries/", InquiryCreateView.as_view()),
    path("settings/image-protection", PublicImageProtectionSettingsView.as_view(), name="public-image-protection-settings"),
    path("settings/image-protection/", PublicImageProtectionSettingsView.as_view()),

    # --- Admin dashboard ---
    path("admin/dashboard/overview", AdminDashboardOverviewView.as_view(), name="admin-dashboard-overview"),
    path("admin/dashboard/overview/", AdminDashboardOverviewView.as_view()),

    # --- Admin uploads & AI ---
    path("admin/upload-image", AdminImageUploadView.as_view(), name="admin-upload-image"),
    path("admin/upload-image/", AdminImageUploadView.as_view()),
    path("admin/ai/generate-product", AIGenerateProductView.as_view(), name="admin-ai-generate-product"),
    path("admin/ai/generate-product/", AIGenerateProductView.as_view()),

    # --- Admin categories ---
    path("admin/categories", AdminCategoryListCreateView.as_view(), name="admin-category-list"),
    path("admin/categories/", AdminCategoryListCreateView.as_view()),
    path("admin/categories/<int:pk>", AdminCategoryDetailView.as_view(), name="admin-category-detail"),
    path("admin/categories/<int:pk>/", AdminCategoryDetailView.as_view()),

    # --- Admin products ---
    path("admin/products", AdminProductListCreateView.as_view(), name="admin-product-list"),
    path("admin/products/", AdminProductListCreateView.as_view()),
    path("admin/products/<int:pk>", AdminProductDetailView.as_view(), name="admin-product-detail"),
    path("admin/products/<int:pk>/", AdminProductDetailView.as_view()),

    # --- Admin inquiries ---
    path("admin/inquiries", AdminInquiryListView.as_view(), name="admin-inquiry-list"),
    path("admin/inquiries/", AdminInquiryListView.as_view()),

    # --- Admin logs ---
    path("admin/logs", AdminErrorLogsView.as_view(), name="admin-error-logs"),
    path("admin/logs/", AdminErrorLogsView.as_view()),

    # --- Admin stock movements (all items) ---
    path("admin/stock-movements", StockMovementListView.as_view(), name="admin-stock-movements"),
    path("admin/stock-movements/", StockMovementListView.as_view()),

    # --- Admin: Google Sheets sync ---
    path("admin/sheets/sync-now", AdminSheetsSyncNowView.as_view(), name="admin-sheets-sync-now"),
    path("admin/sheets/sync-now/", AdminSheetsSyncNowView.as_view()),
    path("admin/sheets/status", AdminSheetsSyncStatusView.as_view(), name="admin-sheets-status"),
    path("admin/sheets/status/", AdminSheetsSyncStatusView.as_view()),
    path("admin/sheets/logs", AdminSheetsSyncLogsView.as_view(), name="admin-sheets-logs"),
    path("admin/sheets/logs/", AdminSheetsSyncLogsView.as_view()),
    # Test connection — verifies credentials, read, and write access
    path("admin/sheets/test-connection", AdminSheetsTestConnectionView.as_view(), name="admin-sheets-test-connection"),
    path("admin/sheets/test-connection/", AdminSheetsTestConnectionView.as_view()),
    # Retry failed — resets all FAILED jobs back to PENDING
    path("admin/sheets/retry-failed", AdminSheetsRetryFailedView.as_view(), name="admin-sheets-retry-failed"),
    path("admin/sheets/retry-failed/", AdminSheetsRetryFailedView.as_view()),

    # --- Admin: AI SEO Optimizer (Phase 1: single-product pipeline) ---
    path("admin/seo/dashboard", SEODashboardView.as_view(), name="admin-seo-dashboard"),
    path("admin/seo/dashboard/", SEODashboardView.as_view()),
    path("admin/seo/products/<int:product_id>", SEOProductDetailView.as_view(), name="admin-seo-product-detail"),
    path("admin/seo/products/<int:product_id>/", SEOProductDetailView.as_view()),
    path("admin/seo/products/<int:product_id>/generate", SEOGenerateDraftView.as_view(), name="admin-seo-generate"),
    path("admin/seo/products/<int:product_id>/generate/", SEOGenerateDraftView.as_view()),
    path("admin/seo/products/<int:product_id>/apply", SEOApplyDraftView.as_view(), name="admin-seo-apply"),
    path("admin/seo/products/<int:product_id>/apply/", SEOApplyDraftView.as_view()),
    path("admin/seo/products/<int:product_id>/draft", SEOSaveDraftView.as_view(), name="admin-seo-save-draft"),
    path("admin/seo/products/<int:product_id>/draft/", SEOSaveDraftView.as_view()),
    path("admin/seo/products/<int:product_id>/fix", SEOFixIssueView.as_view(), name="admin-seo-fix"),
    path("admin/seo/products/<int:product_id>/fix/", SEOFixIssueView.as_view()),
    path("admin/seo/products/<int:product_id>/versions", SEOVersionListView.as_view(), name="admin-seo-versions"),
    path("admin/seo/products/<int:product_id>/versions/", SEOVersionListView.as_view()),
    path("admin/seo/products/<int:product_id>/versions/<int:version_id>/restore", SEORestoreVersionView.as_view(), name="admin-seo-restore"),
    path("admin/seo/products/<int:product_id>/versions/<int:version_id>/restore/", SEORestoreVersionView.as_view()),

    # --- Admin: AI SEO Optimizer (Phase 2: bulk regeneration queue) ---
    path("admin/seo/bulk/start", SEOBulkStartView.as_view(), name="admin-seo-bulk-start"),
    path("admin/seo/bulk/start/", SEOBulkStartView.as_view()),
    path("admin/seo/bulk/status", SEOBulkStatusView.as_view(), name="admin-seo-bulk-status"),
    path("admin/seo/bulk/status/", SEOBulkStatusView.as_view()),
    path("admin/seo/bulk/batches", SEOBulkBatchesView.as_view(), name="admin-seo-bulk-batches"),
    path("admin/seo/bulk/batches/", SEOBulkBatchesView.as_view()),
    path("admin/seo/bulk/retry-failed", SEOBulkRetryFailedView.as_view(), name="admin-seo-bulk-retry-failed"),
    path("admin/seo/bulk/retry-failed/", SEOBulkRetryFailedView.as_view()),

    # --- Admin: Image Protection Settings (Feature 1 & 9) ---
    path("admin/image-protection/settings", ImageProtectionSettingsView.as_view(), name="admin-image-protection-settings"),
    path("admin/image-protection/settings/", ImageProtectionSettingsView.as_view()),
    path("admin/image-protection/audit-logs", ImageProtectionAuditLogListView.as_view(), name="admin-image-protection-audit-logs"),
    path("admin/image-protection/audit-logs/", ImageProtectionAuditLogListView.as_view()),

    # --- Admin: Watermark Management (Features 2, 3, 9, 10, 12) ---
    path("admin/watermark/preview", WatermarkPreviewView.as_view(), name="admin-watermark-preview"),
    path("admin/watermark/preview/", WatermarkPreviewView.as_view()),
    path("admin/watermark/bulk/start", WatermarkBulkStartView.as_view(), name="admin-watermark-bulk-start"),
    path("admin/watermark/bulk/start/", WatermarkBulkStartView.as_view()),
    path("admin/watermark/bulk/status", WatermarkBulkStatusView.as_view(), name="admin-watermark-bulk-status"),
    path("admin/watermark/bulk/status/", WatermarkBulkStatusView.as_view()),
    path("admin/watermark/bulk/batches", WatermarkBulkBatchesView.as_view(), name="admin-watermark-bulk-batches"),
    path("admin/watermark/bulk/batches/", WatermarkBulkBatchesView.as_view()),
    path("admin/watermark/bulk/pause", WatermarkBulkPauseView.as_view(), name="admin-watermark-bulk-pause"),
    path("admin/watermark/bulk/pause/", WatermarkBulkPauseView.as_view()),
    path("admin/watermark/bulk/resume", WatermarkBulkResumeView.as_view(), name="admin-watermark-bulk-resume"),
    path("admin/watermark/bulk/resume/", WatermarkBulkResumeView.as_view()),
    path("admin/watermark/bulk/cancel", WatermarkBulkCancelView.as_view(), name="admin-watermark-bulk-cancel"),
    path("admin/watermark/bulk/cancel/", WatermarkBulkCancelView.as_view()),
    path("admin/watermark/restore", WatermarkRestoreView.as_view(), name="admin-watermark-restore"),
    path("admin/watermark/restore/", WatermarkRestoreView.as_view()),
    path("admin/watermark/restore-all", WatermarkRestoreAllView.as_view(), name="admin-watermark-restore-all"),
    path("admin/watermark/restore-all/", WatermarkRestoreAllView.as_view()),

    # --- Google Sheets → Website webhook (called by Google Apps Script) ---
    # No auth/CSRF — protected by X-Sheets-Webhook-Secret header
    path("inventory/google-sync", SheetsWebhookView.as_view(), name="sheets-webhook"),
    path("inventory/google-sync/", SheetsWebhookView.as_view()),
]