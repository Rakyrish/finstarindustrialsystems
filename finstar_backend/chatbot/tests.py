from unittest.mock import patch
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from .models import ChatMessage, ChatSession


User = get_user_model()


class ChatbotViewTests(APITestCase):
    def setUp(self):
        cache.clear()

    @patch("chatbot.views.generate_chatbot_reply")
    def test_chatbot_creates_session_and_stores_messages(self, mock_generate_reply):
        mock_generate_reply.return_value = SimpleNamespace(
            reply="We can help with HVAC systems in Kenya.",
            status=ChatMessage.Status.NORMAL,
            detected_intent="product_discovery",
            matched_product_name="Industrial HVAC Unit",
        )

        response = self.client.post(
            reverse("chatbot"),
            {"message": "Tell me about your HVAC systems"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ChatSession.objects.count(), 1)
        self.assertEqual(ChatMessage.objects.count(), 2)
        self.assertEqual(ChatMessage.objects.filter(sender=ChatMessage.Sender.USER).count(), 1)
        self.assertEqual(ChatMessage.objects.filter(sender=ChatMessage.Sender.BOT).count(), 1)

    @patch("chatbot.views.generate_chatbot_reply")
    def test_rate_limit_returns_flag_and_skips_openai(self, mock_generate_reply):
        session = ChatSession.objects.create(user_identifier="127.0.0.1")
        for index in range(6):
            ChatMessage.objects.create(
                session=session,
                sender=ChatMessage.Sender.USER,
                message=f"msg {index}",
            )

        response = self.client.post(
            reverse("chatbot"),
            {"message": "Need a quote", "session_id": str(session.id)},
            format="json",
            REMOTE_ADDR="127.0.0.1",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["rate_limited"])
        mock_generate_reply.assert_not_called()
        self.assertTrue(
            ChatMessage.objects.filter(status=ChatMessage.Status.RATE_LIMITED).exists()
        )


class ChatbotInsightsTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin_user = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="password",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)

    def test_insights_include_intents_products_and_failures(self):
        session = ChatSession.objects.create(user_identifier="127.0.0.1")
        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.USER,
            detected_intent="quote_request",
            matched_product_name="Cold Room Panel",
            message="I need a quotation for a cold room.",
        )
        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.Sender.BOT,
            status=ChatMessage.Status.FALLBACK,
            detected_intent="quote_request",
            matched_product_name="Cold Room Panel",
            message="Fallback response",
        )

        response = self.client.get(reverse("admin-chat-insights"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["quote_intent_count"], 1)
        self.assertEqual(response.data["failed_responses_count"], 1)
        self.assertEqual(response.data["most_requested_products"][0]["matched_product_name"], "Cold Room Panel")
