"""
DRF Serializers for chatbot conversation tracking.
"""

import re

from django.utils.html import strip_tags
from rest_framework import serializers

from .models import ChatMessage, ChatSession


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for individual chat messages."""

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "sender",
            "status",
            "detected_intent",
            "matched_product_name",
            "message",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ChatSessionListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the session list view.
    message_count comes from the queryset annotation.
    last_message_preview comes from a SerializerMethodField.
    """

    message_count = serializers.IntegerField(read_only=True)
    last_message_preview = serializers.SerializerMethodField()
    last_message_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ChatSession
        fields = [
            "id",
            "user_identifier",
            "created_at",
            "updated_at",
            "message_count",
            "last_message_preview",
            "last_message_at",
        ]

    def get_last_message_preview(self, obj):
        return obj.get_last_message_preview()


class ChatSessionDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for a single session — includes all messages.
    message_count comes from the queryset annotation.
    """

    messages = ChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ChatSession
        fields = [
            "id",
            "user_identifier",
            "created_at",
            "updated_at",
            "message_count",
            "messages",
        ]


class ChatbotInputSerializer(serializers.Serializer):
    """Validates incoming chatbot request from the frontend."""

    message = serializers.CharField(max_length=2000)
    session_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_message(self, value):
        cleaned = strip_tags(value or "")
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if len(cleaned) < 2:
            raise serializers.ValidationError("Message must be at least 2 characters.")
        return cleaned
