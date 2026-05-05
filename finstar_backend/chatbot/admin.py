"""
Django Admin configuration for chatbot models.
"""

from django.contrib import admin

from .models import ChatMessage, ChatSession


class ChatMessageInline(admin.TabularInline):
    """Inline display of messages within a chat session."""

    model = ChatMessage
    readonly_fields = ("sender", "message", "created_at")
    extra = 0
    ordering = ("created_at",)

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = (
        "short_id",
        "user_identifier",
        "msg_count",
        "created_at",
        "updated_at",
    )
    list_filter = ("created_at",)
    search_fields = ("user_identifier", "messages__message")
    readonly_fields = ("id", "user_identifier", "created_at", "updated_at")
    date_hierarchy = "created_at"
    inlines = [ChatMessageInline]

    def short_id(self, obj):
        return str(obj.id)[:8]

    short_id.short_description = "Session ID"

    def msg_count(self, obj):
        return obj.get_message_count()

    msg_count.short_description = "Messages"

    def has_add_permission(self, request):
        return False  # Sessions are created by the chatbot only

    def has_change_permission(self, request, obj=None):
        return False  # Read-only view


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("short_session", "sender", "short_message", "created_at")
    list_filter = ("sender", "created_at")
    search_fields = ("message",)
    readonly_fields = ("session", "sender", "message", "created_at")
    date_hierarchy = "created_at"

    def short_session(self, obj):
        return str(obj.session_id)[:8]

    short_session.short_description = "Session"

    def short_message(self, obj):
        return obj.message[:80]

    short_message.short_description = "Message"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
