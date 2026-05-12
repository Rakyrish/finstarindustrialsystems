"""
URL routing for FINSTAR products API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .inventory import InventoryItemViewSet, StockMovementListView
from .standalone_inventory import StandaloneInventoryViewSet
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

    # --- Google Sheets → Website webhook (called by Google Apps Script) ---
    # No auth/CSRF — protected by X-Sheets-Webhook-Secret header
    path("inventory/google-sync", SheetsWebhookView.as_view(), name="sheets-webhook"),
    path("inventory/google-sync/", SheetsWebhookView.as_view()),
]