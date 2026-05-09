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

from django.db.models import Count, Max, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import ChatMessage, ChatSession
from .serializers import (
    ChatbotInputSerializer,
    ChatSessionDetailSerializer,
    ChatSessionListSerializer,
)
from .services import QUOTE_INTENTS, generate_chatbot_reply, get_rate_limit_reply

logger = logging.getLogger("chatbot")


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
        else:
            user_identifier = session.user_identifier or self._get_user_identifier(request)
            if session.user_identifier != user_identifier:
                session.user_identifier = user_identifier
                session.save(update_fields=["user_identifier", "updated_at"])

        rate_limit_reply = get_rate_limit_reply(session, user_identifier)
        if rate_limit_reply:
            ChatMessage.objects.create(
                session=session,
                sender=ChatMessage.Sender.BOT,
                status=ChatMessage.Status.RATE_LIMITED,
                message=rate_limit_reply.reply,
            )
            session.save(update_fields=["updated_at"])
            return Response(
                {
                    "reply": rate_limit_reply.reply,
                    "session_id": str(session.id),
                    "rate_limited": True,
                    "rate_limited_reason": rate_limit_reply.reason,
                    "retry_after_seconds": rate_limit_reply.retry_after_seconds,
                },
                status=status.HTTP_200_OK,
            )

        chatbot_reply = generate_chatbot_reply(session, user_message)

        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.USER,
            detected_intent=chatbot_reply.detected_intent,
            matched_product_name=chatbot_reply.matched_product_name,
            message=user_message,
        )
        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.BOT,
            status=chatbot_reply.status,
            detected_intent=chatbot_reply.detected_intent,
            matched_product_name=chatbot_reply.matched_product_name,
            message=chatbot_reply.reply,
        )

        # Touch session updated_at
        session.save(update_fields=["updated_at"])

        return Response(
            {
                "reply": chatbot_reply.reply,
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
            last_message_at=Max("messages__created_at"),
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
                | Q(messages__matched_product_name__icontains=search)
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
        bot_messages = ChatMessage.objects.filter(sender=ChatMessage.Sender.BOT).count()
        messages_today = ChatMessage.objects.filter(created_at__gte=today_start).count()
        active_sessions_24h = ChatSession.objects.filter(
            updated_at__gte=last_24h
        ).count()
        quote_intent_count = ChatMessage.objects.filter(
            sender=ChatMessage.Sender.USER,
            detected_intent__in=QUOTE_INTENTS,
        ).count()
        failed_responses_count = ChatMessage.objects.filter(
            sender=ChatMessage.Sender.BOT,
            status=ChatMessage.Status.FALLBACK,
        ).count()
        rate_limited_count = ChatMessage.objects.filter(
            sender=ChatMessage.Sender.BOT,
            status=ChatMessage.Status.RATE_LIMITED,
        ).count()

        # Recent messages (last 20)
        recent_messages = list(
            ChatMessage.objects.select_related("session")
            .order_by("-created_at")[:20]
            .values(
                "id",
                "sender",
                "status",
                "detected_intent",
                "matched_product_name",
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
        common_intents = list(
            ChatMessage.objects.filter(sender=ChatMessage.Sender.USER)
            .exclude(detected_intent="")
            .values("detected_intent")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        most_requested_products = list(
            ChatMessage.objects.filter(sender=ChatMessage.Sender.USER)
            .exclude(matched_product_name="")
            .values("matched_product_name")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        recent_failures = list(
            ChatMessage.objects.filter(
                sender=ChatMessage.Sender.BOT,
                status__in=[ChatMessage.Status.FALLBACK, ChatMessage.Status.RATE_LIMITED],
            )
            .order_by("-created_at")[:10]
            .values("id", "status", "message", "created_at", "session_id")
        )
        usage_statistics = {
            "avg_messages_per_session": round(total_messages / total_sessions, 1)
            if total_sessions
            else 0,
            "quote_intent_sessions": ChatSession.objects.filter(
                messages__sender=ChatMessage.Sender.USER,
                messages__detected_intent__in=QUOTE_INTENTS,
            )
            .distinct()
            .count(),
            "failed_response_rate": round((failed_responses_count / bot_messages) * 100, 1)
            if bot_messages
            else 0,
            "rate_limited_rate": round((rate_limited_count / max(total_messages, 1)) * 100, 1),
        }

        return Response(
            {
                "total_sessions": total_sessions,
                "total_messages": total_messages,
                "messages_today": messages_today,
                "active_sessions_24h": active_sessions_24h,
                "quote_intent_count": quote_intent_count,
                "failed_responses_count": failed_responses_count,
                "rate_limited_count": rate_limited_count,
                "recent_messages": recent_messages,
                "common_questions": common_questions,
                "common_intents": common_intents,
                "most_requested_products": most_requested_products,
                "recent_failures": recent_failures,
                "usage_statistics": usage_statistics,
            }
        )
