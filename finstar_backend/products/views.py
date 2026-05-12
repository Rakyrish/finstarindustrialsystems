"""
API views for FINSTAR products, categories, inquiries, auth, and monitoring.
"""

import logging
import time
from collections import deque
from pathlib import Path

from django.conf import settings
from decimal import Decimal
from django.db import connection
from django.db.models import Count, Q, F, Sum, DecimalField, IntegerField
from django.db.models.functions import Coalesce
from django.db.utils import OperationalError
from rest_framework import generics, parsers, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser, AllowAny

from .cloudinary_service import (
    CloudinaryConfigurationError,
    upload_product_image,
)
from .models import (
    Category, Inquiry, Product, InventoryItem,
    StandaloneInventoryItem, StandaloneInventoryMovement
)
from .pagination import ProductPagination
from .schema_state import table_exists
from .serializers import (
    AdminCategorySerializer,
    AdminInquirySerializer,
    AdminProductSerializer,
    CategorySerializer,
    InquirySerializer,
    ProductListSerializer,
    ProductSerializer,
    InventoryItemSerializer,
)

logger = logging.getLogger("products")


# ── Shared auth mixin ─────────────────────────────────────────────────────────
# All admin views inherit this so JWT is explicit and never relies on the
# project-wide DEFAULT_AUTHENTICATION_CLASSES default.

class JWTAdminMixin:
    """Enforce JWT authentication + IsAdminUser on any view that inherits it."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]


# ── Auth ──────────────────────────────────────────────────────────────────────

class StaffTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.get_username()
        token["is_staff"] = user.is_staff
        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        if not self.user.is_staff:
            raise AuthenticationFailed(
                "Staff access is required for this dashboard."
            )

        data["user"] = {
            "id": self.user.id,
            "username": self.user.get_username(),
            "email": self.user.email,
            "is_staff": self.user.is_staff,
        }
        return data


class StaffTokenObtainPairView(TokenObtainPairView):
    serializer_class = StaffTokenObtainPairSerializer


# ── Health check (public) ─────────────────────────────────────────────────────

class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        start = time.perf_counter()

        try:
            connection.ensure_connection()
        except OperationalError:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            return Response(
                {
                    "status": "error",
                    "database": "disconnected",
                    "response_time_ms": elapsed_ms,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return Response(
            {
                "status": "ok",
                "database": "connected",
                "response_time_ms": elapsed_ms,
            }
        )


# ── Admin: dashboard overview ─────────────────────────────────────────────────

class AdminDashboardOverviewView(JWTAdminMixin, APIView):
    def get(self, request):
        product_totals = Product.objects.aggregate(
            total_products=Count("id"),
            active_products=Count("id", filter=Q(is_active=True)),
            inactive_products=Count("id", filter=Q(is_active=False)),
        )

        # Inventory metrics
        inventory_stats = StandaloneInventoryItem.objects.aggregate(
            total_inventory_items=Count("id"),
            total_inventory_value=Coalesce(Sum(F("quantity_in_stock") * F("sell_price"), output_field=DecimalField()), Decimal('0.00')),
            total_cost_value=Coalesce(Sum(F("quantity_in_stock") * F("cost_price"), output_field=DecimalField()), Decimal('0.00')),
            low_stock_count=Count("id", filter=Q(quantity_in_stock__gt=0, quantity_in_stock__lte=F("reorder_level"))),
            out_of_stock_count=Count("id", filter=Q(quantity_in_stock=0)),
            in_stock_count=Count("id", filter=Q(quantity_in_stock__gt=F("reorder_level"))),
            sections_count=Count("section", distinct=True)
        )

        # Category breakdown
        products_by_category = list(
            Category.objects.annotate(count=Count("products"))
            .values("name", "count")
            .filter(count__gt=0)
            .order_by("-count")
        )

        # Recent inquiries
        recent_inquiries = list(
            Inquiry.objects.order_by("-created_at")[:5]
            .values("id", "name", "email", "message", "created_at")
        )

        # Stock distribution
        stock_distribution = {
            "in_stock": inventory_stats["in_stock_count"],
            "low_stock": inventory_stats["low_stock_count"],
            "out_of_stock": inventory_stats["out_of_stock_count"],
        }

        # Inventory by section
        inventory_by_section = list(
            StandaloneInventoryItem.objects.values("section")
            .annotate(
                count=Count("id"),
                value=Coalesce(Sum(F("quantity_in_stock") * F("sell_price"), output_field=DecimalField()), Decimal('0.00'))
            )
            .order_by("-value")
        )

        # Top inventory items by value
        top_items_by_value = list(
            StandaloneInventoryItem.objects.annotate(
                value=F("quantity_in_stock") * F("sell_price")
            )
            .order_by("-value")[:10]
            .values("name", "quantity_in_stock", "value")
        )

        data = {
            **product_totals,
            **inventory_stats,
            "total_categories": Category.objects.count(),
            "total_inquiries": Inquiry.objects.count(),
            "products_by_category": products_by_category,
            "stock_distribution": stock_distribution,
            "recent_inquiries": recent_inquiries,
            "inventory_by_section": inventory_by_section,
            "top_items_by_value": top_items_by_value,
        }
        return Response(data)


# ── Admin: image upload ───────────────────────────────────────────────────────

class AdminImageUploadView(JWTAdminMixin, APIView):
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request):
        file_obj = request.FILES.get("image")
        if not file_obj:
            raise ValidationError({"image": ["An image file is required."]})

        self._validate_file(file_obj)

        try:
            image_url = upload_product_image(file_obj)
        except CloudinaryConfigurationError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception(
                "Cloudinary image upload failed for user_id=%s", request.user.id
            )
            return Response(
                {"detail": "Image upload failed. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"image_url": image_url}, status=status.HTTP_201_CREATED)

    def _validate_file(self, file_obj):
        extension = Path(file_obj.name).suffix.lower().lstrip(".")
        if extension not in settings.ALLOWED_PRODUCT_IMAGE_EXTENSIONS:
            raise ValidationError(
                {"image": ["Unsupported file type. Allowed types: jpg, jpeg, png, webp."]}
            )

        content_type = getattr(file_obj, "content_type", "")
        if content_type not in settings.ALLOWED_PRODUCT_IMAGE_CONTENT_TYPES:
            raise ValidationError(
                {"image": ["Unsupported content type. Allowed types: image/jpeg, image/png, image/webp."]}
            )

        if file_obj.size > settings.PRODUCT_IMAGE_MAX_UPLOAD_BYTES:
            raise ValidationError(
                {"image": [f"Image file is too large. Maximum size is {settings.PRODUCT_IMAGE_MAX_UPLOAD_BYTES} bytes."]}
            )


# ── Public: categories ────────────────────────────────────────────────────────

class CategoryListView(generics.ListAPIView):
    """
    GET /api/categories
    List public categories with active product counts.
    """
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(
            product_count_annotated=Count(
                "products", filter=Q(products__is_active=True)
            )
        ).order_by("name")


# ── Admin: categories ─────────────────────────────────────────────────────────

class AdminCategoryListCreateView(JWTAdminMixin, generics.ListCreateAPIView):
    """
    GET  /api/admin/categories
    POST /api/admin/categories
    """
    serializer_class = AdminCategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(
            product_count_annotated=Count("products")
        ).order_by("name")


class AdminCategoryDetailView(JWTAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/admin/categories/{id}
    PUT    /api/admin/categories/{id}
    PATCH  /api/admin/categories/{id}
    DELETE /api/admin/categories/{id}
    """
    serializer_class = AdminCategorySerializer
    lookup_field = "pk"

    def get_queryset(self):
        return Category.objects.annotate(
            product_count_annotated=Count("products")
        ).order_by("name")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        product_count = instance.products.count()
        if product_count > 0:
            return Response(
                {
                    "error": (
                        f"Cannot delete category with {product_count} product(s). "
                        "Remove or reassign them first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Public: products ──────────────────────────────────────────────────────────

class ProductListView(generics.ListAPIView):
    """
    GET /api/products
    Paginated public product list.
    """
    serializer_class = ProductListSerializer
    pagination_class = ProductPagination

    def get_queryset(self):
        queryset = Product.objects.select_related("category").filter(is_active=True)

        category_slug = self.request.query_params.get("category")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        featured = self.request.query_params.get("featured")
        if featured is not None:
            queryset = queryset.filter(featured=featured.lower() == "true")

        return queryset.order_by("-created_at")


class ProductDetailView(generics.RetrieveAPIView):
    """
    GET /api/products/{slug}
    Retrieve a single active product by slug.
    """
    serializer_class = ProductSerializer
    queryset = Product.objects.select_related("category").filter(is_active=True)
    lookup_field = "slug"


# ── Admin: products ───────────────────────────────────────────────────────────

class AdminProductListCreateView(JWTAdminMixin, generics.ListCreateAPIView):
    """
    GET  /api/admin/products
    POST /api/admin/products
    """
    serializer_class = AdminProductSerializer
    pagination_class = ProductPagination
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        queryset = Product.objects.select_related("category").all()

        category_value = self.request.query_params.get("category")
        if category_value:
            if category_value.isdigit():
                queryset = queryset.filter(category_id=category_value)
            else:
                queryset = queryset.filter(category__slug=category_value)

        status_value = self.request.query_params.get("status")
        if status_value == "active":
            queryset = queryset.filter(is_active=True)
        elif status_value == "inactive":
            queryset = queryset.filter(is_active=False)

        search_term = self.request.query_params.get("search")
        if search_term:
            queryset = queryset.filter(name__icontains=search_term.strip())

        return queryset.order_by("-updated_at")


class AdminProductDetailView(JWTAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/admin/products/{id}
    PUT    /api/admin/products/{id}
    PATCH  /api/admin/products/{id}
    DELETE /api/admin/products/{id}
    """
    serializer_class = AdminProductSerializer
    queryset = Product.objects.select_related("category").all()
    lookup_field = "pk"

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Public: inquiries ─────────────────────────────────────────────────────────

_SUBJECT_MAP = {
    "refrigeration": "Refrigeration Systems",
    "hvac": "Air Conditioning / HVAC",
    "boilers": "Boilers & Steam Systems",
    "cold-rooms": "Cold Rooms & Insulation",
    "fittings": "Industrial Fittings & Tools",
    "maintenance": "Maintenance / Service",
    "general": "General Inquiry",
}


class InquiryCreateView(generics.CreateAPIView):
    """
    POST /api/inquiries

    Flow:
      1. Validate & save inquiry to database (always happens)
      2. Trigger Resend emails (non-blocking — failure is logged, not raised)
      3. Return 201 with success message
    """
    serializer_class = InquirySerializer
    queryset = Inquiry.objects.all()

    def create(self, request, *args, **kwargs):
        from products.email_service import send_inquiry_emails, EmailPayload

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # ── Step 1: Save to database ──────────────────────────────────────────
        inquiry = serializer.save()

        # ── Step 2: Build email payload ───────────────────────────────────────
        subject_key = (inquiry.subject or "").strip().lower()
        subject_label = _SUBJECT_MAP.get(subject_key, inquiry.subject or "General Inquiry")

        payload = EmailPayload(
            name=inquiry.name,
            email=inquiry.email,
            message=inquiry.message,
            phone=inquiry.phone or "",
            company=inquiry.company or "",
            subject_label=subject_label,
            products=inquiry.products or [],
            source_url=inquiry.source_url or "",
            inquiry_id=inquiry.pk,
            submitted_at=inquiry.created_at,
        )

        # ── Step 3: Send emails (non-blocking) ────────────────────────────────
        results = send_inquiry_emails(payload)

        # Persist email_sent flag
        email_dispatched = results.get("notification") or results.get("confirmation")
        if email_dispatched:
            inquiry.email_sent = True
            inquiry.save(update_fields=["email_sent"])

        return Response(
            {
                "message": "Inquiry submitted successfully.",
                "email_sent": email_dispatched,
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )



# ── Admin: inquiries ──────────────────────────────────────────────────────────

class AdminInquiryListView(JWTAdminMixin, generics.ListAPIView):
    """
    GET /api/admin/inquiries
    """
    serializer_class = AdminInquirySerializer
    ordering_fields = ["created_at", "name", "email"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Inquiry.objects.all().order_by("-created_at")

        search_term = self.request.query_params.get("search")
        if search_term:
            queryset = queryset.filter(
                Q(name__icontains=search_term)
                | Q(email__icontains=search_term)
                | Q(message__icontains=search_term)
            )

        return queryset


# ── Admin: error logs ─────────────────────────────────────────────────────────

class AdminErrorLogsView(JWTAdminMixin, APIView):
    """Return recent ERROR/WARNING lines from the application log file."""

    def get(self, request):
        log_file = Path(settings.BASE_DIR) / "logs" / "finstar.log"

        if not log_file.exists():
            return Response({"logs": [], "message": "No log file found."})

        error_lines: deque[str] = deque(maxlen=100)
        try:
            with open(log_file, "r", encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    stripped = line.strip()
                    if stripped and any(
                        stripped.startswith(lvl) for lvl in ("ERROR", "WARNING")
                    ):
                        error_lines.append(stripped)
        except OSError:
            logger.exception("Failed to read log file")
            return Response(
                {"error": "Could not read log file."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"logs": list(error_lines)})


# ── Admin: AI product generation ──────────────────────────────────────────────

class AIGenerateProductView(JWTAdminMixin, APIView):
    """
    POST /api/admin/ai/generate-product

    Accept an image file or image_url, analyse it with AI,
    and return auto-generated product details.
    """
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def post(self, request):
        from .ai_service import AIServiceError, generate_product_details

        image_url = None

        # Option 1: uploaded file → push to Cloudinary first
        file_obj = request.FILES.get("image")
        if file_obj:
            try:
                image_url = upload_product_image(file_obj)
            except CloudinaryConfigurationError as exc:
                return Response(
                    {"detail": str(exc)},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            except Exception:
                logger.exception(
                    "Cloudinary upload failed during AI generation for user_id=%s",
                    request.user.id,
                )
                return Response(
                    {"detail": "Image upload failed. Please try again."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        # Option 2: URL supplied directly
        if not image_url:
            image_url = request.data.get("image_url")

        if not image_url:
            return Response(
                {"detail": "An image file or image_url is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            details = generate_product_details(image_url)
        except AIServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(details, status=status.HTTP_200_OK)


# ── Admin: Google Sheets sync ──────────────────────────────────────────────────

class AdminSheetsSyncNowView(JWTAdminMixin, APIView):
    """
    POST /api/admin/sheets/sync-now

    Triggers a full background sync of all inventory to Google Sheets.
    Returns immediately — sync runs in a background thread.
    """

    def post(self, request):
        from .services.inventory_sync import enqueue_full_sync
        from .sheets_service import get_sheets_service_state

        state = get_sheets_service_state()
        if not state.enabled:
            return Response(
                {"detail": "Google Sheets sync is disabled. Set GOOGLE_SHEETS_ENABLED=True in your environment."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not state.configured:
            return Response(
                {"detail": "Google Sheets sync is not fully configured. Check spreadsheet ID and service account credentials."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = enqueue_full_sync(triggered_by="manual", requested_by=request.user)
        logger.info("[Sheets] Manual full sync queued by user_id=%s (job_id=%s)", request.user.id, job.id)

        return Response({
            "detail": "Full inventory sync queued.",
            "message": "The background sync worker will reconcile both inventory sheets shortly.",
            "job_id": job.id,
        })


class AdminSheetsSyncStatusView(JWTAdminMixin, APIView):
    """
    GET /api/admin/sheets/status

    Returns current sync configuration status and last sync summary.
    """

    def get(self, request):
        from django.conf import settings as dj_settings
        from .models import InventorySyncJob, SyncLog
        from .sheets_service import get_sheets_service_state

        state = get_sheets_service_state()
        enabled = getattr(dj_settings, "GOOGLE_SHEETS_ENABLED", False)
        spreadsheet_id = getattr(dj_settings, "GOOGLE_SHEETS_SPREADSHEET_ID", "")
        configured = state.configured

        if not table_exists("products_inventorysyncjob"):
            return Response(
                {
                    "enabled": enabled,
                    "configured": False,
                    "available": False,
                    "status_reason": "migration_required",
                    "spreadsheet_id": "",
                    "last_sync": None,
                    "last_success_at": None,
                    "job_counts": {
                        "pending": 0,
                        "processing": 0,
                        "retry": 0,
                        "failed": 0,
                    },
                    "stats_24h": {
                        "total": 0,
                        "success": 0,
                        "failure": 0,
                        "partial": 0,
                        "skipped": 0,
                    },
                    "detail": (
                        "Inventory sync schema update required. Run the latest Django migrations "
                        "before using Google Sheets sync."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Last sync entry
        last_sync = SyncLog.objects.order_by("-created_at").first()
        last_sync_data = None
        if last_sync:
            last_sync_data = {
                "id": last_sync.id,
                "sync_type": last_sync.sync_type,
                "sync_type_label": last_sync.get_sync_type_display(),
                "status": last_sync.status,
                "status_label": last_sync.get_status_display(),
                "items_synced": last_sync.items_synced,
                "error_message": last_sync.error_message,
                "started_at": last_sync.started_at,
                "completed_at": last_sync.completed_at,
                "triggered_by": last_sync.triggered_by,
                "triggered_by_label": last_sync.get_triggered_by_display(),
                "duration_seconds": last_sync.duration_seconds,
                "created_at": last_sync.created_at,
            }

        last_success = SyncLog.objects.filter(status=SyncLog.SyncStatus.SUCCESS).order_by("-completed_at").first()

        from django.utils import timezone as tz
        from datetime import timedelta
        since_24h = tz.now() - timedelta(hours=24)
        recent_logs = SyncLog.objects.filter(created_at__gte=since_24h)
        jobs = InventorySyncJob.objects.all()

        return Response({
            "enabled": enabled,
            "configured": configured,
            "available": state.available and configured,
            "status_reason": state.reason,
            "spreadsheet_id": spreadsheet_id if configured else "",
            "last_sync": last_sync_data,
            "last_success_at": last_success.completed_at if last_success else None,
            "job_counts": {
                "pending": jobs.filter(status=InventorySyncJob.JobStatus.PENDING).count(),
                "processing": jobs.filter(status=InventorySyncJob.JobStatus.PROCESSING).count(),
                "retry": jobs.filter(status=InventorySyncJob.JobStatus.RETRY).count(),
                "failed": jobs.filter(status=InventorySyncJob.JobStatus.FAILED).count(),
            },
            "stats_24h": {
                "total": recent_logs.count(),
                "success": recent_logs.filter(status="success").count(),
                "failure": recent_logs.filter(status="failure").count(),
                "partial": recent_logs.filter(status="partial").count(),
                "skipped": recent_logs.filter(status="skipped").count(),
            },
        })


class AdminSheetsSyncLogsView(JWTAdminMixin, APIView):
    """
    GET /api/admin/sheets/logs

    Returns recent sync log entries (last 50).
    Optional query params: ?status=failure&limit=20
    """

    def get(self, request):
        from .models import SyncLog

        if not table_exists("products_inventorysyncjob"):
            return Response(
                {
                    "logs": [],
                    "count": 0,
                    "detail": (
                        "Inventory sync schema update required. Run the latest Django migrations "
                        "before using Google Sheets sync logs."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        qs = SyncLog.objects.all()

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        limit = min(int(request.query_params.get("limit", 50)), 200)
        qs = qs[:limit]

        logs = [
            {
                "id": log.id,
                "sync_type": log.sync_type,
                "sync_type_label": log.get_sync_type_display(),
                "status": log.status,
                "status_label": log.get_status_display(),
                "items_synced": log.items_synced,
                "error_message": log.error_message,
                "started_at": log.started_at,
                "completed_at": log.completed_at,
                "triggered_by": log.triggered_by,
                "triggered_by_label": log.get_triggered_by_display(),
                "duration_seconds": log.duration_seconds,
                "created_at": log.created_at,
            }
            for log in qs
        ]

        return Response({"logs": logs, "count": len(logs)})


class AdminSheetsTestConnectionView(JWTAdminMixin, APIView):
    """
    POST /api/admin/sheets/test-connection

    Verifies:
    1. Credentials are configured and service account JSON is valid
    2. The spreadsheet exists and is accessible (read)
    3. Write permissions are confirmed

    Returns a clear success or failure response with diagnostic details.
    """

    def post(self, request):
        import time as _time
        from .sheets_service import get_sheets_service_state, get_sheets_service

        t0 = _time.perf_counter()
        state = get_sheets_service_state()

        if not state.enabled:
            return Response(
                {
                    "success": False,
                    "message": "Google Sheets sync is disabled. Set GOOGLE_SHEETS_ENABLED=True in your .env file.",
                    "step": "config_check",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not state.configured:
            return Response(
                {
                    "success": False,
                    "message": f"Configuration incomplete: {state.reason}. Check GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON in .env.",
                    "step": "config_check",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = get_sheets_service()
        if not service:
            return Response(
                {
                    "success": False,
                    "message": "Failed to initialize Google Sheets API client. Check your service account JSON for syntax errors.",
                    "step": "auth",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        spreadsheet_id = getattr(settings, "GOOGLE_SHEETS_SPREADSHEET_ID", "")

        # Step 1 — Read access: fetch spreadsheet metadata
        try:
            meta = service.get_spreadsheet_metadata()
        except Exception as exc:
            logger.error(
                "[Sheets] Test connection READ failed for spreadsheet_id=%s: %s",
                spreadsheet_id, exc,
            )
            return Response(
                {
                    "success": False,
                    "message": f"Cannot read spreadsheet: {str(exc)[:300]}. Ensure the sheet is shared with the service account email.",
                    "step": "read_access",
                    "spreadsheet_id": spreadsheet_id,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        spreadsheet_title = meta.get("properties", {}).get("title", "Unknown")
        sheets = [
            {"id": s["properties"]["sheetId"], "title": s["properties"]["title"]}
            for s in meta.get("sheets", [])
        ]

        # Step 2 — Write access: attempt a harmless write then immediately undo it
        test_tab = "_finstar_test_"
        try:
            from .sheets_service import SyncRecord, DATA_START_ROW
            service._ensure_tab_and_headers(test_tab)
            service._service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=f"'{test_tab}'!A:J",
                valueInputOption="USER_ENTERED",
                insertDataOption="INSERT_ROWS",
                body={"values": [["__test__", "__test__", "", 0, "", 0, 0, 0, "", ""] ]},
            ).execute()
            # Clean up: delete the test tab
            sheet_id = service._get_sheet_id(test_tab)
            service._service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={"requests": [{"deleteSheet": {"sheetId": sheet_id}}]},
            ).execute()
        except Exception as exc:
            logger.error(
                "[Sheets] Test connection WRITE failed for spreadsheet_id=%s: %s",
                spreadsheet_id, exc,
            )
            return Response(
                {
                    "success": False,
                    "message": f"Read access OK but write test failed: {str(exc)[:300]}. Ensure the service account has 'Editor' access to the spreadsheet.",
                    "step": "write_access",
                    "spreadsheet_id": spreadsheet_id,
                    "spreadsheet_title": spreadsheet_title,
                    "sheets": sheets,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        elapsed = round(_time.perf_counter() - t0, 2)
        logger.info(
            "[Sheets] Test connection PASSED | spreadsheet_id=%s title='%s' elapsed=%ss user_id=%s",
            spreadsheet_id, spreadsheet_title, elapsed, request.user.id,
        )

        return Response(
            {
                "success": True,
                "message": f"Google Sheets connection verified successfully in {elapsed}s. Read & write access confirmed.",
                "spreadsheet_id": spreadsheet_id,
                "spreadsheet_title": spreadsheet_title,
                "sheets": sheets,
                "elapsed_seconds": elapsed,
            }
        )


class AdminSheetsRetryFailedView(JWTAdminMixin, APIView):
    """
    POST /api/admin/sheets/retry-failed

    Resets all FAILED InventorySyncJob records back to PENDING
    so the background worker picks them up on its next cycle.
    """

    def post(self, request):
        from .models import InventorySyncJob
        from .schema_state import table_exists

        if not table_exists("products_inventorysyncjob"):
            return Response(
                {"detail": "Inventory sync schema update required. Run the latest Django migrations first."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        failed_qs = InventorySyncJob.objects.filter(status=InventorySyncJob.JobStatus.FAILED)
        count = failed_qs.count()

        if count == 0:
            return Response({"detail": "No failed sync jobs to retry.", "retried": 0})

        from django.utils import timezone as tz
        failed_qs.update(
            status=InventorySyncJob.JobStatus.PENDING,
            next_attempt_at=tz.now(),
            last_error="",
            attempts=0,
        )

        logger.info(
            "[Sheets] %d failed sync job(s) reset to PENDING by user_id=%s",
            count, request.user.id,
        )

        return Response(
            {
                "detail": f"{count} failed job(s) queued for retry.",
                "retried": count,
            }
        )


# ── Google Sheets → Website Webhook ───────────────────────────────────────────


class SheetsWebhookView(APIView):
    """
    POST /api/inventory/google-sync/

    Receives change notifications from Google Apps Script when someone edits
    the Google Sheet directly. Updates PostgreSQL to reflect the change.

    Security: caller must supply the correct secret token in the
    X-Sheets-Webhook-Secret header. The endpoint is intentionally exempt from
    CSRF and JWT authentication because it is called by Apps Script — not a
    browser user.

    Loop prevention: before saving, we set instance._skip_sheet_sync = True so
    that the Django post_save signal does NOT queue another Google Sheets sync
    job. This prevents infinite sync loops.
    """

    authentication_classes = []   # no JWT needed — uses shared secret
    permission_classes = []       # public endpoint, protected by secret

    def post(self, request, *args, **kwargs):
        # ── 1. Authenticate via shared secret ──────────────────────────────
        expected_secret = getattr(settings, "SHEETS_WEBHOOK_SECRET", "")
        incoming_secret = request.headers.get("X-Sheets-Webhook-Secret", "")

        if not expected_secret:
            logger.error("[Sheets Webhook] SHEETS_WEBHOOK_SECRET is not configured on server.")
            return Response(
                {"error": "Webhook not configured on server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        import hmac
        if not hmac.compare_digest(expected_secret, incoming_secret):
            logger.warning(
                "[Sheets Webhook] Rejected request — invalid secret | ip=%s",
                request.META.get("REMOTE_ADDR", "unknown"),
            )
            return Response(
                {"error": "Unauthorized. Invalid webhook secret."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── 2. Parse and validate payload ───────────────────────────────────
        data = request.data
        sku = str(data.get("sku", "")).strip()
        if not sku:
            return Response(
                {"error": "Missing required field: sku"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Collect optional fields; at least one must be provided
        updates = {}
        raw_qty = data.get("quantity")
        raw_reorder = data.get("reorder_level")
        raw_cost = data.get("cost_price")
        raw_sell = data.get("sell_price")

        try:
            if raw_qty is not None:
                updates["quantity_in_stock"] = int(raw_qty)
            if raw_reorder is not None:
                updates["reorder_level"] = int(raw_reorder)
            if raw_cost is not None:
                updates["cost_price"] = float(raw_cost)
            if raw_sell is not None:
                updates["sell_price"] = float(raw_sell)
        except (ValueError, TypeError) as exc:
            return Response(
                {"error": f"Invalid numeric value: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not updates:
            return Response(
                {"error": "No updatable fields provided (quantity, reorder_level, cost_price, sell_price)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 3. Locate item by SKU (standalone inventory only) ───────────────
        from .models import StandaloneInventoryItem

        try:
            item = StandaloneInventoryItem.objects.get(sku=sku)
        except StandaloneInventoryItem.DoesNotExist:
            logger.warning("[Sheets Webhook] Unknown SKU=%s — item not found in DB.", sku)
            return Response(
                {"error": f"No inventory item found with SKU '{sku}'."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ── 4. Apply updates with loop-prevention flag ──────────────────────
        for field, value in updates.items():
            setattr(item, field, value)

        # This flag tells the Django post_save signal NOT to queue a Sheets
        # sync job, preventing an infinite update loop.
        item._skip_sheet_sync = True

        item.save(update_fields=list(updates.keys()) + ["updated_at"])

        logger.info(
            "[Sheets Webhook] Updated SKU=%s | fields=%s | ip=%s",
            sku,
            list(updates.keys()),
            request.META.get("REMOTE_ADDR", "unknown"),
        )

        return Response(
            {
                "ok": True,
                "sku": sku,
                "updated_fields": list(updates.keys()),
                "new_values": updates,
            },
            status=status.HTTP_200_OK,
        )
