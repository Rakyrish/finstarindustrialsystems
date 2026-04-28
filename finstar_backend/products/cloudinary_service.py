import logging

import cloudinary.uploader
from django.conf import settings


logger = logging.getLogger("products")


class CloudinaryConfigurationError(Exception):
    pass


def is_cloudinary_configured():
    return all(
        [
            getattr(settings, "CLOUDINARY_CLOUD_NAME", ""),
            getattr(settings, "CLOUDINARY_API_KEY", ""),
            getattr(settings, "CLOUDINARY_API_SECRET", ""),
        ]
    )


def upload_product_image(file_obj):
    if not is_cloudinary_configured():
        raise CloudinaryConfigurationError(
            "Cloudinary is not configured for this environment."
        )

    upload_result = cloudinary.uploader.upload(
        file_obj,
        folder=settings.CLOUDINARY_UPLOAD_FOLDER,
        resource_type="image",
        overwrite=False,
    )

    secure_url = upload_result.get("secure_url")
    if not secure_url:
        logger.error("Cloudinary upload succeeded without secure_url: %s", upload_result)
        raise CloudinaryConfigurationError("Cloudinary did not return a secure image URL.")

    return secure_url
