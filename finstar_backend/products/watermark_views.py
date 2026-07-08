"""
Image Protection & Watermark Management — admin API views (+ one public view).
"""

import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import (
    ImageProtectionAuditLog,
    ImageProtectionSettings,
    Product,
    ProductImageProtection,
)
from .serializers import (
    ImageProtectionAuditLogSerializer,
    ImageProtectionSettingsSerializer,
    PublicImageProtectionSettingsSerializer,
)
from .services.watermark_bulk import (
    cancel_batch,
    enqueue_watermark_jobs,
    get_batch_status,
    get_recent_batches,
    pause_batch,
    resume_batch,
)
from .watermark_service import get_watermarked_url

logger = logging.getLogger("products")


class JWTAdminMixin:
    """Enforce JWT authentication + IsAdminUser (mirrors views.py's mixin)."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]


# ── Settings (Feature 1 & 9) ────────────────────────────────────────────────

class ImageProtectionSettingsView(JWTAdminMixin, APIView):
    """GET/PATCH /api/admin/image-protection/settings — the global singleton."""

    def get(self, request):
        settings_obj = ImageProtectionSettings.get_solo()
        return Response(ImageProtectionSettingsSerializer(settings_obj).data)

    def patch(self, request):
        settings_obj = ImageProtectionSettings.get_solo()
        serializer = ImageProtectionSettingsSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)

        ImageProtectionAuditLog.objects.create(
            user=request.user,
            action=ImageProtectionAuditLog.Action.SETTINGS_CHANGED,
            details={"changed_fields": list(request.data.keys())},
        )
        return Response(ImageProtectionSettingsSerializer(settings_obj).data)


class WatermarkPreviewView(JWTAdminMixin, APIView):
    """
    POST /api/admin/watermark/preview

    Body (all optional): watermark_text, watermark_secondary_text,
    watermark_opacity, watermark_font_size, watermark_angle,
    watermark_position, product_id.

    Builds a preview URL from the given (unsaved) overrides against a
    sample product image — never persists anything (Feature 9).
    """

    def post(self, request):
        base = ImageProtectionSettings.get_solo()
        data = request.data

        preview_settings = ImageProtectionSettings(
            watermark_text=data.get("watermark_text", base.watermark_text),
            watermark_secondary_text=data.get("watermark_secondary_text", base.watermark_secondary_text),
            watermark_opacity=data.get("watermark_opacity", base.watermark_opacity),
            watermark_font_size=data.get("watermark_font_size", base.watermark_font_size),
            watermark_angle=data.get("watermark_angle", base.watermark_angle),
            watermark_position=data.get("watermark_position", base.watermark_position),
        )

        product_id = data.get("product_id")
        if product_id:
            sample_product = get_object_or_404(Product, pk=product_id)
        else:
            sample_product = (
                Product.objects.filter(is_active=True)
                .exclude(image_url="")
                .order_by("-updated_at")
                .first()
            )

        if sample_product is None or not sample_product.image_url:
            return Response(
                {"detail": "No product with an image is available to preview against."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        preview_url = get_watermarked_url(sample_product.image_url, preview_settings)
        if preview_url is None:
            return Response(
                {"detail": "That product's image is not Cloudinary-hosted and cannot be previewed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            "preview_url": preview_url,
            "product_id": sample_product.id,
            "product_name": sample_product.name,
        })


# ── Bulk watermark job (Feature 2 & 12) ─────────────────────────────────────

class WatermarkBulkStartView(JWTAdminMixin, APIView):
    """POST /api/admin/watermark/bulk/start — Body: {"scope", "category_id"?}"""

    def post(self, request):
        scope = request.data.get("scope", "all")
        category_id = request.data.get("category_id")

        try:
            result = enqueue_watermark_jobs(scope, category_id=category_id, requested_by=request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)


class WatermarkBulkStatusView(JWTAdminMixin, APIView):
    """GET /api/admin/watermark/bulk/status?batch_id=... — defaults to the most recent batch."""

    def get(self, request):
        from .models import WatermarkJob

        batch_id = request.query_params.get("batch_id")
        if not batch_id:
            latest = WatermarkJob.objects.order_by("-created_at").first()
            if not latest:
                return Response({
                    "batch_id": None, "total": 0,
                    "pending": 0, "processing": 0, "completed": 0, "failed": 0, "cancelled": 0,
                    "percent_complete": 0, "is_running": False, "is_paused": False, "is_cancelled": False,
                    "started_at": None, "eta_seconds": None, "recent": [],
                })
            batch_id = latest.batch_id

        result = get_batch_status(batch_id)
        if result is None:
            return Response(
                {"detail": f"No watermark bulk jobs found for batch_id '{batch_id}'."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(result)


class WatermarkBulkBatchesView(JWTAdminMixin, APIView):
    """GET /api/admin/watermark/bulk/batches — 20 most recent bulk runs, newest first."""

    def get(self, request):
        return Response(get_recent_batches())


class WatermarkBulkPauseView(JWTAdminMixin, APIView):
    """POST /api/admin/watermark/bulk/pause — Body: {"batch_id"}"""

    def post(self, request):
        batch_id = request.data.get("batch_id")
        if not batch_id:
            return Response({"detail": "batch_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        pause_batch(batch_id, user=request.user)
        return Response(get_batch_status(batch_id))


class WatermarkBulkResumeView(JWTAdminMixin, APIView):
    """POST /api/admin/watermark/bulk/resume — Body: {"batch_id"}"""

    def post(self, request):
        batch_id = request.data.get("batch_id")
        if not batch_id:
            return Response({"detail": "batch_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        resume_batch(batch_id, user=request.user)
        return Response(get_batch_status(batch_id))


class WatermarkBulkCancelView(JWTAdminMixin, APIView):
    """POST /api/admin/watermark/bulk/cancel — Body: {"batch_id"}"""

    def post(self, request):
        batch_id = request.data.get("batch_id")
        if not batch_id:
            return Response({"detail": "batch_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        cancel_batch(batch_id, user=request.user)
        return Response(get_batch_status(batch_id))


# ── Restore originals (Feature 10) ──────────────────────────────────────────

class WatermarkRestoreView(JWTAdminMixin, APIView):
    """POST /api/admin/watermark/restore — Body: {"product_id"}. Original image_url untouched."""

    def post(self, request):
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"detail": "product_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        product = get_object_or_404(Product, pk=product_id)
        protection, _ = ProductImageProtection.objects.get_or_create(product=product)
        protection.is_watermark_applied = False
        protection.last_restored_at = timezone.now()
        protection.save(update_fields=["is_watermark_applied", "last_restored_at", "updated_at"])

        ImageProtectionAuditLog.objects.create(
            user=request.user,
            action=ImageProtectionAuditLog.Action.RESTORE_SINGLE,
            product=product,
            details={},
        )
        return Response({"detail": f"Restored original image for '{product.name}'."})


class WatermarkRestoreAllView(JWTAdminMixin, APIView):
    """POST /api/admin/watermark/restore-all — Body: {"confirm": true} required."""

    def post(self, request):
        if not request.data.get("confirm"):
            return Response(
                {"detail": "This action affects every product. Pass {\"confirm\": true} to proceed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        restored_count = ProductImageProtection.objects.filter(is_watermark_applied=True).update(
            is_watermark_applied=False, last_restored_at=now, updated_at=now,
        )

        ImageProtectionAuditLog.objects.create(
            user=request.user,
            action=ImageProtectionAuditLog.Action.RESTORE_ALL,
            details={"restored_count": restored_count},
        )
        return Response({"detail": f"Restored original images for {restored_count} product(s).", "restored_count": restored_count})


# ── Audit log (Feature 11) ──────────────────────────────────────────────────

class ImageProtectionAuditLogListView(JWTAdminMixin, APIView):
    """GET /api/admin/image-protection/audit-logs?limit=100"""

    def get(self, request):
        try:
            limit = min(500, max(1, int(request.query_params.get("limit", 100))))
        except ValueError:
            limit = 100

        logs = ImageProtectionAuditLog.objects.select_related("user", "product").order_by("-created_at")[:limit]
        return Response(ImageProtectionAuditLogSerializer(logs, many=True).data)


# ── Public (Features 6, 7, 8 — the site needs to know what to enforce) ─────

class PublicImageProtectionSettingsView(APIView):
    """GET /api/settings/image-protection — unauthenticated, toggles only."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        settings_obj = ImageProtectionSettings.get_solo()
        return Response(PublicImageProtectionSettingsSerializer(settings_obj).data)
