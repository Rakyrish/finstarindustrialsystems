"""
URL routing for the chatbot API.
"""

from django.urls import path

from .views import (
    AdminChatInsightsView,
    AdminChatSessionDetailView,
    AdminChatSessionListView,
    ChatbotView,
)

urlpatterns = [
    # Public chatbot
    path("chatbot", ChatbotView.as_view(), name="chatbot"),
    path("chatbot/", ChatbotView.as_view()),

    # Admin — chat sessions
    path("admin/chat-sessions", AdminChatSessionListView.as_view(), name="admin-chat-sessions"),
    path("admin/chat-sessions/", AdminChatSessionListView.as_view()),
    path("admin/chat-sessions/<uuid:pk>", AdminChatSessionDetailView.as_view(), name="admin-chat-session-detail"),
    path("admin/chat-sessions/<uuid:pk>/", AdminChatSessionDetailView.as_view()),

    # Admin — chat insights
    path("admin/chat-insights", AdminChatInsightsView.as_view(), name="admin-chat-insights"),
    path("admin/chat-insights/", AdminChatInsightsView.as_view()),
]
