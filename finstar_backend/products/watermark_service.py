"""
Cloudinary-based watermark rendering.

Watermarks are NOT baked into a stored binary — they're computed as a
Cloudinary on-the-fly text-overlay transformation URL against the existing
`image_url`'s public_id. Cloudinary renders the overlay into the actual
delivered image bytes (so it survives a right-click "save image"), while
the original `image_url` in the database is never touched. This keeps
"restore" trivial and lets watermark design changes apply site-wide
instantly, with no reprocessing of stored files.
"""

import logging
import re
from urllib.parse import parse_qs, urlparse

from cloudinary import CloudinaryImage

from .models import ImageProtectionSettings, ProductImageProtection

logger = logging.getLogger("products")

_PUBLIC_ID_RE = re.compile(r"/upload/(?:v\d+/)?(?P<public_id>.+)\.[A-Za-z0-9]{2,5}$")


def _unwrap_next_image_proxy(image_url: str) -> str:
    """
    Some legacy rows store the browser-rendered Next.js image-optimization
    proxy URL (`/_next/image?url=<encoded>&w=...&q=...`) instead of the raw
    Cloudinary secure_url. Unwrap it so watermarking still works.
    """
    parsed = urlparse(image_url)
    if "/_next/image" not in parsed.path:
        return image_url

    inner = parse_qs(parsed.query).get("url", [None])[0]
    return inner or image_url


def extract_public_id(image_url: str) -> str | None:
    """Parse the Cloudinary public_id out of a secure_url. None if not Cloudinary-hosted."""
    if not image_url:
        return None

    image_url = _unwrap_next_image_proxy(image_url)

    parsed = urlparse(image_url)
    if not parsed.hostname or "cloudinary.com" not in parsed.hostname:
        return None

    match = _PUBLIC_ID_RE.search(parsed.path)
    if not match:
        return None

    return match.group("public_id")


def build_watermark_transformation(settings: ImageProtectionSettings) -> list[dict]:
    """Build the Cloudinary transformation list for the configured watermark design."""
    opacity = max(1, min(100, settings.watermark_opacity))
    angle = max(-90, min(90, settings.watermark_angle))
    tiled = settings.watermark_position == ImageProtectionSettings.WatermarkPosition.TILED

    main_layer = {
        "overlay": {
            "font_family": "Arial",
            "font_size": settings.watermark_font_size,
            "font_weight": "bold",
            "text": settings.watermark_text,
        },
        "color": "white",
        "opacity": opacity,
        "angle": angle,
        "gravity": "center",
    }
    if tiled:
        main_layer["flags"] = "tiled"

    transformation = [main_layer]

    if settings.watermark_secondary_text:
        secondary_layer = {
            "overlay": {
                "font_family": "Arial",
                "font_size": max(10, round(settings.watermark_font_size * 0.5)),
                "font_weight": "bold",
                "text": settings.watermark_secondary_text,
            },
            "color": "white",
            "opacity": opacity,
            "angle": angle,
            "gravity": "center",
            "y": round(settings.watermark_font_size * 0.9),
        }
        if tiled:
            secondary_layer["flags"] = "tiled"
        transformation.append(secondary_layer)

    return transformation


def get_watermarked_url(image_url: str, settings: ImageProtectionSettings) -> str | None:
    """Build the watermarked delivery URL for `image_url`. None if it isn't Cloudinary-hosted."""
    public_id = extract_public_id(image_url)
    if not public_id:
        return None

    transformation = build_watermark_transformation(settings)

    try:
        return CloudinaryImage(public_id).build_url(transformation=transformation, secure=True)
    except Exception:
        logger.exception("Failed to build watermark transformation URL for public_id=%s", public_id)
        return None


def get_effective_image_url(product) -> str:
    """
    The URL that should be served to site visitors for this product: the
    watermarked version when watermarking is enabled globally AND applied
    to this specific product, otherwise the original `image_url`.
    """
    if not product.image_url:
        return product.image_url

    settings = ImageProtectionSettings.get_solo()
    if not settings.watermark_enabled:
        return product.image_url

    try:
        protection = product.image_protection
    except ProductImageProtection.DoesNotExist:
        return product.image_url

    if not protection.is_watermark_applied:
        return product.image_url

    watermarked_url = get_watermarked_url(product.image_url, settings)
    return watermarked_url or product.image_url
