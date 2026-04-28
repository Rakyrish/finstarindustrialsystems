"""
API views for FINSTAR products, categories, inquiries, auth, and monitoring.
"""

import logging
import time
from collections import deque
from pathlib import Path

from django.conf import settings
from django.db import connection
from django.db.models import Count, Q
from django.db.utils import OperationalError
from rest_framework import generics, parsers, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .cloudinary_service import (
    CloudinaryConfigurationError,
    upload_product_image,
)
from .models import Category, Inquiry, Product
from .pagination import ProductPagination
from .serializers import (
    AdminCategorySerializer,
    AdminInquirySerializer,
    AdminProductSerializer,
    CategorySerializer,
    InquirySerializer,
    ProductListSerializer,
    ProductSerializer,
)

logger = logging.getLogger("products")


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
            raise AuthenticationFailed("Staff access is required for this dashboard.")

        data["user"] = {
            "id": self.user.id,
            "username": self.user.get_username(),
            "email": self.user.email,
            "is_staff": self.user.is_staff,
        }
        return data


class StaffTokenObtainPairView(TokenObtainPairView):
    serializer_class = StaffTokenObtainPairSerializer


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

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


class AdminDashboardOverviewView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        product_totals = Product.objects.aggregate(
            total_products=Count("id"),
            active_products=Count("id", filter=Q(is_active=True)),
            inactive_products=Count("id", filter=Q(is_active=False)),
        )

        data = {
            **product_totals,
            "total_categories": Category.objects.count(),
            "total_inquiries": Inquiry.objects.count(),
        }
        return Response(data)


class AdminImageUploadView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request):
        print("FILES:", request.FILES)
        print("Content-Type:", request.content_type)
        print("DATA:", request.data)

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
            logger.exception("Cloudinary image upload failed for user_id=%s", request.user.id)
            return Response(
                {"detail": "Image upload failed. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"image_url": image_url}, status=status.HTTP_201_CREATED)

    def _validate_file(self, file_obj):
        extension = Path(file_obj.name).suffix.lower().lstrip(".")
        if extension not in settings.ALLOWED_PRODUCT_IMAGE_EXTENSIONS:
            raise ValidationError(
                {
                    "image": [
                        "Unsupported file type. Allowed types: jpg, jpeg, png, webp."
                    ]
                }
            )

        content_type = getattr(file_obj, "content_type", "")

        if content_type not in settings.ALLOWED_PRODUCT_IMAGE_CONTENT_TYPES:
            raise ValidationError(
                {
                    "image": [
                        "Unsupported content type. Allowed types: image/jpeg, image/png, image/webp."
                    ]
                }
            )

        if file_obj.size > settings.PRODUCT_IMAGE_MAX_UPLOAD_BYTES:
            raise ValidationError(
                {
                    "image": [
                        f"Image file is too large. Maximum size is {settings.PRODUCT_IMAGE_MAX_UPLOAD_BYTES} bytes."
                    ]
                }
            )


class CategoryListView(generics.ListAPIView):
    """
    GET /api/categories
    List public categories with active product counts.
    """

    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(
            product_count_annotated=Count("products", filter=Q(products__is_active=True))
        ).order_by("name")


class AdminCategoryListCreateView(generics.ListCreateAPIView):
    """
    GET /api/admin/categories
    POST /api/admin/categories
    """

    serializer_class = AdminCategorySerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(
            product_count_annotated=Count("products")
        ).order_by("name")


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminCategorySerializer
    permission_classes = [permissions.IsAdminUser]
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
                    "error": f"Cannot delete category with {product_count} product(s). "
                    "Remove or reassign them first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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


class AdminProductListCreateView(generics.ListCreateAPIView):
    """
    GET /api/admin/products
    POST /api/admin/products
    """

    serializer_class = AdminProductSerializer
    permission_classes = [permissions.IsAdminUser]
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


class AdminProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/admin/products/{id}
    PUT /api/admin/products/{id}
    DELETE /api/admin/products/{id}
    """

    serializer_class = AdminProductSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Product.objects.select_related("category").all()
    lookup_field = "pk"

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class InquiryCreateView(generics.CreateAPIView):
    """
    POST /api/inquiries
    Submit a contact form inquiry.
    """

    serializer_class = InquirySerializer
    queryset = Inquiry.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Inquiry submitted successfully.", "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class AdminInquiryListView(generics.ListAPIView):
    """
    GET /api/admin/inquiries
    """

    serializer_class = AdminInquirySerializer
    permission_classes = [permissions.IsAdminUser]
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


class AdminErrorLogsView(APIView):
    """Return recent ERROR/WARNING lines from the application log file."""

    permission_classes = [permissions.IsAdminUser]

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
