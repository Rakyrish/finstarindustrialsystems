"""
DRF Serializers for chatbot conversation tracking.
"""

from rest_framework import serializers

from .models import ChatMessage, ChatSession


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for individual chat messages."""

    class Meta:
        model = ChatMessage
        fields = ["id", "sender", "message", "created_at"]
        read_only_fields = ["id", "created_at"]


class ChatSessionListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the session list view.
    message_count comes from the queryset annotation.
    last_message_preview comes from a SerializerMethodField.
    """

    message_count = serializers.IntegerField(read_only=True)
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = [
            "id",
            "user_identifier",
            "created_at",
            "updated_at",
            "message_count",
            "last_message_preview",
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
