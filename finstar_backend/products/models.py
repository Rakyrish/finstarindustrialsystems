"""
Models for FINSTAR Industrial Systems.

Three core models:
  - Category  (product grouping)
  - Product   (individual equipment listing)
  - Inquiry   (contact form submissions)
"""

from django.db import models
from django.utils.text import slugify


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
        """Number of products in this category."""
        return self.products.count()


class Product(models.Model):
    """Industrial equipment product."""

    name = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True, db_index=True)
    description = models.TextField()
    short_description = models.CharField(max_length=500, blank=True, default="")
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
    """Contact form submission."""

    name = models.CharField(max_length=200)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "inquiries"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — {self.email}"
