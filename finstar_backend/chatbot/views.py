"""
API views for the chatbot system.

Public:
  - ChatbotView — POST /api/chatbot/ — accepts user message, returns AI response

Admin (JWT protected):
  - AdminChatSessionListView — GET /api/admin/chat-sessions/
  - AdminChatSessionDetailView — GET /api/admin/chat-sessions/<uuid>/
  - AdminChatInsightsView — GET /api/admin/chat-insights/
"""

import logging
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .gemini_service import FALLBACK_RESPONSE, GeminiServiceError, get_ai_response
from .models import ChatMessage, ChatSession
from .serializers import (
    ChatbotInputSerializer,
    ChatSessionDetailSerializer,
    ChatSessionListSerializer,
)

logger = logging.getLogger("chatbot")

# Max messages per session (rate limit)
MAX_MESSAGES_PER_SESSION = 25


# ── Pagination ────────────────────────────────────────────────────────────────

class ChatSessionPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ── Public: Chatbot endpoint ─────────────────────────────────────────────────

class ChatbotView(APIView):
    """
    POST /api/chatbot/

    Accepts: { "message": "...", "session_id": "uuid" (optional) }
    Returns: { "reply": "...", "session_id": "uuid" }

    Creates or resumes a chat session, stores both user and bot messages,
    and returns the AI-generated response.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ChatbotInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_message = serializer.validated_data["message"]
        session_id = serializer.validated_data.get("session_id")

        # Get or create session
        session = None
        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id)
            except ChatSession.DoesNotExist:
                pass  # Will create a new session below

        if session is None:
            # Extract user identifier from request
            user_identifier = self._get_user_identifier(request)
            session = ChatSession.objects.create(user_identifier=user_identifier)

        # Rate limit check: max messages per session
        user_message_count = session.messages.filter(sender="user").count()
        if user_message_count >= MAX_MESSAGES_PER_SESSION:
            return Response(
                {
                    "reply": (
                        "You've reached the message limit for this session. "
                        "For further assistance, please contact us directly:\n\n"
                        "📞 Call: +254 726 559 606\n"
                        "💬 WhatsApp: +254 726 559 606\n"
                        "📧 Email: info@finstarindustrial.com"
                    ),
                    "session_id": str(session.id),
                    "rate_limited": True,
                },
                status=status.HTTP_200_OK,
            )

        # Store user message
        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.USER,
            message=user_message,
        )

        # Build conversation history for context
        history = list(
            session.messages.order_by("created_at").values("sender", "message")
        )

        # Get AI response
        try:
            ai_reply = get_ai_response(user_message, conversation_history=history)
        except GeminiServiceError:
            ai_reply = FALLBACK_RESPONSE
            logger.warning(
                "Gemini failed for session %s, using fallback", session.id
            )

        # Store bot response
        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.BOT,
            message=ai_reply,
        )

        # Touch session updated_at
        session.save(update_fields=["updated_at"])

        return Response(
            {
                "reply": ai_reply,
                "session_id": str(session.id),
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _get_user_identifier(request):
        """Extract a user identifier from the request (IP-based fallback)."""
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")


# ── Admin mixin ───────────────────────────────────────────────────────────────

class JWTAdminMixin:
    """Enforce JWT authentication + IsAdminUser."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]


# ── Admin: Chat session list ─────────────────────────────────────────────────

class AdminChatSessionListView(JWTAdminMixin, generics.ListAPIView):
    """
    GET /api/admin/chat-sessions/

    Returns paginated list of all chat sessions with last message preview.
    Supports filtering by date range and search.
    """

    serializer_class = ChatSessionListSerializer
    pagination_class = ChatSessionPagination

    def get_queryset(self):
        queryset = ChatSession.objects.annotate(
            message_count=Count("messages"),
        ).order_by("-updated_at")

        # Date filtering
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        # Search in messages
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(messages__message__icontains=search)
                | Q(user_identifier__icontains=search)
            ).distinct()

        return queryset


# ── Admin: Chat session detail ────────────────────────────────────────────────

class AdminChatSessionDetailView(JWTAdminMixin, generics.RetrieveAPIView):
    """
    GET /api/admin/chat-sessions/<uuid>/

    Returns full conversation with all messages.
    """

    serializer_class = ChatSessionDetailSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return ChatSession.objects.annotate(
            message_count=Count("messages"),
        )


# ── Admin: Chat insights ─────────────────────────────────────────────────────

class AdminChatInsightsView(JWTAdminMixin, APIView):
    """
    GET /api/admin/chat-insights/

    Returns monitoring stats: total conversations, messages today,
    active sessions (last 24h), recent messages, and common questions.
    """

    def get(self, request):
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total_sessions = ChatSession.objects.count()
        total_messages = ChatMessage.objects.count()
        messages_today = ChatMessage.objects.filter(created_at__gte=today_start).count()
        active_sessions_24h = ChatSession.objects.filter(
            updated_at__gte=last_24h
        ).count()

        # Recent messages (last 20)
        recent_messages = list(
            ChatMessage.objects.select_related("session")
            .order_by("-created_at")[:20]
            .values(
                "id",
                "sender",
                "message",
                "created_at",
                "session_id",
            )
        )

        # Simple "common questions" — most frequent user messages (basic grouping)
        common_questions = list(
            ChatMessage.objects.filter(sender="user")
            .values("message")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        return Response(
            {
                "total_sessions": total_sessions,
                "total_messages": total_messages,
                "messages_today": messages_today,
                "active_sessions_24h": active_sessions_24h,
                "recent_messages": recent_messages,
                "common_questions": common_questions,
            }
        )
