"""
URL routing for FINSTAR products API.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

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
    CategoryListView,
    HealthCheckView,
    InquiryCreateView,
    ProductDetailView,
    ProductListView,
    StaffTokenObtainPairView,
)


urlpatterns = [
    path("health", HealthCheckView.as_view(), name="health"),
    path("health/", HealthCheckView.as_view()),
    path("auth/token", StaffTokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("auth/token/", StaffTokenObtainPairView.as_view()),
    path("auth/token/refresh", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/token/refresh/", TokenRefreshView.as_view()),
    path("categories", CategoryListView.as_view(), name="category-list"),
    path("categories/", CategoryListView.as_view()),
    path("products", ProductListView.as_view(), name="product-list"),
    path("products/", ProductListView.as_view()),
    path("products/<slug:slug>", ProductDetailView.as_view(), name="product-detail"),
    path("products/<slug:slug>/", ProductDetailView.as_view()),
    path("inquiries", InquiryCreateView.as_view(), name="inquiry-create"),
    path("inquiries/", InquiryCreateView.as_view()),
    path(
        "admin/dashboard/overview",
        AdminDashboardOverviewView.as_view(),
        name="admin-dashboard-overview",
    ),
    path("admin/dashboard/overview/", AdminDashboardOverviewView.as_view()),
    path("admin/upload-image", AdminImageUploadView.as_view(), name="admin-upload-image"),
    path("admin/upload-image/", AdminImageUploadView.as_view()),
    path("admin/categories", AdminCategoryListCreateView.as_view(), name="admin-category-list"),
    path("admin/categories/", AdminCategoryListCreateView.as_view()),
    path("admin/categories/<int:pk>", AdminCategoryDetailView.as_view(), name="admin-category-detail"),
    path("admin/categories/<int:pk>/", AdminCategoryDetailView.as_view()),
    path("admin/products", AdminProductListCreateView.as_view(), name="admin-product-list"),
    path("admin/products/", AdminProductListCreateView.as_view()),
    path("admin/products/<int:pk>", AdminProductDetailView.as_view(), name="admin-product-detail"),
    path("admin/products/<int:pk>/", AdminProductDetailView.as_view()),
    path("admin/inquiries", AdminInquiryListView.as_view(), name="admin-inquiry-list"),
    path("admin/inquiries/", AdminInquiryListView.as_view()),
    path("admin/logs", AdminErrorLogsView.as_view(), name="admin-error-logs"),
    path("admin/logs/", AdminErrorLogsView.as_view()),
    path("admin/ai/generate-product", AIGenerateProductView.as_view(), name="admin-ai-generate-product"),
    path("admin/ai/generate-product/", AIGenerateProductView.as_view()),
]
