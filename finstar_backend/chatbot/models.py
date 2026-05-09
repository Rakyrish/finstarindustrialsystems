"""
Models for chatbot conversation tracking.

ChatSession — groups messages into a single user conversation.
ChatMessage — individual message from either user or bot.
"""

import uuid

from django.db import models


class ChatSession(models.Model):
    """A single chatbot conversation session."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_identifier = models.CharField(
        max_length=200,
        blank=True,
        default="",
        db_index=True,
        help_text="Browser-generated UUID or other identifier",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"Session {str(self.id)[:8]} — {self.created_at:%Y-%m-%d %H:%M}"

    def get_message_count(self):
        """Return the number of messages in this session."""
        return self.messages.count()

    def get_last_message_preview(self):
        """Return a preview of the last message in this session."""
        last = self.messages.order_by("-created_at").first()
        if last:
            return last.message[:100]
        return ""


class ChatMessage(models.Model):
    """A single message within a chat session."""

    class Sender(models.TextChoices):
        USER = "user", "User"
        BOT = "bot", "Bot"

    class Status(models.TextChoices):
        NORMAL = "normal", "Normal"
        FALLBACK = "fallback", "Fallback"
        RATE_LIMITED = "rate_limited", "Rate limited"

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.CharField(
        max_length=4,
        choices=Sender.choices,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NORMAL,
        db_index=True,
    )
    detected_intent = models.CharField(
        max_length=40,
        blank=True,
        default="",
        db_index=True,
    )
    matched_product_name = models.CharField(
        max_length=300,
        blank=True,
        default="",
        db_index=True,
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["session", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.sender}] {self.message[:60]}"
