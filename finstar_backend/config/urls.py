"""
URL configuration for FINSTAR backend.
"""

from django.contrib import admin
# pyrefly: ignore [missing-import]
from django.urls import path, include

urlpatterns = [
    path("main-admin/", admin.site.urls),
    path("api/", include("products.urls")),
    path("api/", include("chatbot.urls")),
]
