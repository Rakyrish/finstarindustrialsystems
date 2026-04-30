"""
API tests for the FINSTAR products app.
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import Category, Inquiry, Product


User = get_user_model()


class BaseAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name="Refrigeration")
        self.product = Product.objects.create(
            name="Scroll Refrigeration Unit",
            description="A high-efficiency industrial refrigeration system.",
            short_description="Industrial cooling",
            category=self.category,
            image_url="https://example.com/product.jpg",
        )


class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username="staff",
            email="staff@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="StrongPass123!",
        )

    def test_staff_user_can_get_jwt_token(self):
        response = self.client.post(
            "/api/auth/token",
            {"username": "staff", "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertTrue(response.data["user"]["is_staff"])

    def test_non_staff_user_cannot_get_dashboard_token(self):
        response = self.client.post(
            "/api/auth/token",
            {"username": "user", "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PublicProductAPITests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.inactive_product = Product.objects.create(
            name="Inactive Compressor",
            description="This should not be returned publicly.",
            category=self.category,
            is_active=False,
        )

    def test_product_list_returns_200(self):
        response = self.client.get("/api/products")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["slug"], self.product.slug)

    def test_public_product_detail_hides_soft_deleted_products(self):
        response = self.client.get(f"/api/products/{self.inactive_product.slug}")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_category_list_returns_active_product_counts(self):
        response = self.client.get("/api/categories")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["product_count"], 1)

    def test_health_endpoint_returns_ok(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["database"], "connected")


class AdminProductAPITests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.staff_user = User.objects.create_user(
            username="adminstaff",
            email="admin@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
        token_response = self.client.post(
            "/api/auth/token",
            {"username": "adminstaff", "password": "StrongPass123!"},
            format="json",
        )
        self.admin_client = APIClient()
        self.admin_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}"
        )

    def test_admin_product_list_requires_authentication(self):
        response = self.client.get("/api/admin/products")

        self.assertIn(
            response.status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )

    def test_admin_product_create_works(self):
        response = self.admin_client.post(
            "/api/admin/products",
            {
                "name": "New Chiller System",
                "description": "Built for cold room performance.",
                "short_description": "Cold room chiller",
                "category_id": self.category.id,
                "image_url": "https://res.cloudinary.com/demo/image/upload/v1/products/chiller.jpg",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 2)
        self.assertEqual(response.data["category"]["id"], self.category.id)
        self.assertIn("res.cloudinary.com", response.data["image_url"])

    def test_admin_product_update_works(self):
        response = self.admin_client.put(
            f"/api/admin/products/{self.product.id}",
            {
                "name": "Updated Refrigeration Unit",
                "slug": self.product.slug,
                "description": "Updated product description.",
                "short_description": "Updated short description",
                "category_id": self.category.id,
                "image_url": "https://example.com/updated-product.jpg",
                "is_active": True,
                "featured": True,
                "specs": {"voltage": "415V"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Updated Refrigeration Unit")
        self.assertTrue(self.product.featured)

    def test_soft_delete_works(self):
        response = self.admin_client.delete(f"/api/admin/products/{self.product.id}")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.product.refresh_from_db()
        self.assertFalse(self.product.is_active)

    def test_dashboard_overview_returns_totals(self):
        Inquiry.objects.create(
            name="John Doe",
            email="john@example.com",
            message="Please send a quote for a cold room installation.",
        )

        response = self.admin_client.get("/api/admin/dashboard/overview")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_products"], 1)
        self.assertEqual(response.data["active_products"], 1)
        self.assertEqual(response.data["total_categories"], 1)
        self.assertEqual(response.data["total_inquiries"], 1)


class InquiryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username="inqstaff",
            email="inqstaff@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
        token_response = self.client.post(
            "/api/auth/token",
            {"username": "inqstaff", "password": "StrongPass123!"},
            format="json",
        )
        self.admin_client = APIClient()
        self.admin_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}"
        )

    def test_inquiry_submission_works(self):
        response = self.client.post(
            "/api/inquiries",
            {
                "name": "John Doe",
                "email": "john@example.com",
                "message": "I need a quote for a cold room installation.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Inquiry.objects.count(), 1)
        self.assertIn("message", response.data)

    def test_admin_inquiry_list_works(self):
        Inquiry.objects.create(
            name="John Doe",
            email="john@example.com",
            message="I need a quote for a cold room installation.",
        )

        response = self.admin_client.get("/api/admin/inquiries")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)


class AdminImageUploadAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username="uploadstaff",
            email="uploadstaff@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
        token_response = self.client.post(
            "/api/auth/token",
            {"username": "uploadstaff", "password": "StrongPass123!"},
            format="json",
        )
        self.admin_client = APIClient()
        self.admin_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}"
        )

    @patch("products.cloudinary_service.cloudinary.uploader.upload")
    def test_image_upload_succeeds_and_returns_url(self, mock_upload):
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/products/equipment.png"
        }
        image = SimpleUploadedFile(
            "equipment.png",
            b"fake-image-content",
            content_type="image/png",
        )

        response = self.admin_client.post(
            "/api/admin/upload-image",
            {"image": image},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["image_url"],
            "https://res.cloudinary.com/demo/image/upload/v1/products/equipment.png",
        )
        mock_upload.assert_called_once()

    def test_invalid_file_type_is_rejected(self):
        invalid_file = SimpleUploadedFile(
            "equipment.pdf",
            b"%PDF-1.4 fake content",
            content_type="application/pdf",
        )

        response = self.admin_client.post(
            "/api/admin/upload-image",
            {"image": invalid_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unsupported file type", response.data["image"][0])

    def test_upload_requires_authenticated_admin(self):
        image = SimpleUploadedFile(
            "equipment.png",
            b"fake-image-content",
            content_type="image/png",
        )

        response = self.client.post(
            "/api/admin/upload-image",
            {"image": image},
            format="multipart",
        )

        self.assertIn(
            response.status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )


class AIGenerateProductAPITests(TestCase):
    """Tests for POST /api/admin/ai/generate-product."""

    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username="aistaff",
            email="aistaff@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
        token_response = self.client.post(
            "/api/auth/token",
            {"username": "aistaff", "password": "StrongPass123!"},
            format="json",
        )
        self.admin_client = APIClient()
        self.admin_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}"
        )

    def test_ai_generate_requires_admin(self):
        """Unauthenticated requests are rejected."""
        response = self.client.post(
            "/api/admin/ai/generate-product",
            {"image_url": "https://example.com/image.jpg"},
            format="json",
        )

        self.assertIn(
            response.status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )

    @patch("products.ai_service.generate_product_details")
    def test_ai_generate_with_image_url(self, mock_generate):
        """Providing an image_url triggers AI and returns product details."""
        mock_generate.return_value = {
            "name": "Industrial Compressor",
            "short_description": "A heavy-duty compressor for industrial use.",
            "description": "This compressor is designed for demanding environments...",
        }

        response = self.admin_client.post(
            "/api/admin/ai/generate-product",
            {"image_url": "https://example.com/compressor.jpg"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Industrial Compressor")
        self.assertIn("short_description", response.data)
        self.assertIn("description", response.data)
        mock_generate.assert_called_once_with("https://example.com/compressor.jpg")

    @patch("products.ai_service.generate_product_details")
    @patch("products.cloudinary_service.cloudinary.uploader.upload")
    def test_ai_generate_with_image_file(self, mock_upload, mock_generate):
        """Uploading a file triggers Cloudinary upload then AI generation."""
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/products/test.png"
        }
        mock_generate.return_value = {
            "name": "HVAC Unit",
            "short_description": "Efficient HVAC system.",
            "description": "A top-of-the-line HVAC unit for commercial buildings...",
        }

        image = SimpleUploadedFile(
            "hvac.png",
            b"fake-image-content",
            content_type="image/png",
        )

        response = self.admin_client.post(
            "/api/admin/ai/generate-product",
            {"image": image},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "HVAC Unit")
        mock_upload.assert_called_once()
        mock_generate.assert_called_once_with(
            "https://res.cloudinary.com/demo/image/upload/v1/products/test.png"
        )

    def test_ai_generate_missing_input_returns_400(self):
        """Sending neither file nor URL returns 400."""
        response = self.admin_client.post(
            "/api/admin/ai/generate-product",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("required", response.data["detail"].lower())

