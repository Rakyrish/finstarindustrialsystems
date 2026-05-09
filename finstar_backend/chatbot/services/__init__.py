"""
Chatbot service orchestration.
"""

from __future__ import annotations

import re
from collections import OrderedDict
from dataclasses import dataclass
from datetime import timedelta

from django.core.cache import cache
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.html import strip_tags

from products.models import Category, Product

from ..models import ChatMessage, ChatSession
from ..prompts import FALLBACK_RESPONSE, QUOTE_FOLLOW_UP
from .openai_service import OpenAIServiceError, generate_ai_reply

MAX_MESSAGES_PER_SESSION = 25
SESSION_BURST_LIMIT = 6
IP_BURST_LIMIT = 10
RATE_LIMIT_WINDOW = timedelta(minutes=1)
MAX_HISTORY_MESSAGES = 10
CATALOGUE_CACHE_TIMEOUT = 300

QUOTE_INTENTS = {
    "quote_request",
    "pricing",
    "availability",
    "installation",
    "delivery",
    "consultation",
}

INTENT_KEYWORDS: "OrderedDict[str, tuple[str, ...]]" = OrderedDict(
    [
        ("quote_request", ("quote", "quotation", "rfq", "tender", "proposal")),
        ("pricing", ("price", "cost", "budget", "how much", "pricing")),
        ("availability", ("available", "availability", "stock", "in stock")),
        ("installation", ("install", "installation", "commissioning", "setup")),
        ("delivery", ("delivery", "deliver", "shipment", "shipping", "lead time")),
        ("consultation", ("consult", "consultation", "advise", "site visit", "survey")),
        ("product_discovery", ("recommend", "suggest", "need", "looking for", "best")),
    ]
)

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "can",
    "for",
    "from",
    "have",
    "help",
    "i",
    "in",
    "is",
    "it",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "please",
    "the",
    "to",
    "we",
    "with",
    "you",
    "your",
}


@dataclass
class ChatbotReply:
    reply: str
    status: str
    detected_intent: str
    matched_product_name: str


@dataclass
class RateLimitResult:
    reply: str
    reason: str
    retry_after_seconds: int | None = None


def sanitize_user_message(value: str) -> str:
    cleaned = strip_tags(value or "")
    cleaned = re.sub(r"[\x00-\x1f\x7f]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def detect_intent(message: str) -> str:
    text = message.lower()
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return intent
    return "general_inquiry"


def get_rate_limit_reply(session: ChatSession, user_identifier: str) -> RateLimitResult | None:
    cutoff = timezone.now() - RATE_LIMIT_WINDOW
    total_user_messages = session.messages.filter(sender=ChatMessage.Sender.USER).count()

    if total_user_messages >= MAX_MESSAGES_PER_SESSION:
        return RateLimitResult(
            reply=(
                "This chat session has reached its limit. Please contact Finstar Industrial "
                "Systems Ltd by phone +254 726 559 606, WhatsApp +254 726 559 606, or "
                "email info@finstarindustrial.com for further assistance."
            ),
            reason="session_limit",
        )

    session_burst_count = session.messages.filter(
        sender=ChatMessage.Sender.USER,
        created_at__gte=cutoff,
    ).count()
    if session_burst_count >= SESSION_BURST_LIMIT:
        return RateLimitResult(
            reply=(
                "Please wait a moment before sending another message. You can also contact "
                "our sales team directly via WhatsApp or phone at +254 726 559 606."
            ),
            reason="burst_limit",
            retry_after_seconds=int(RATE_LIMIT_WINDOW.total_seconds()),
        )

    ip_burst_count = ChatMessage.objects.filter(
        sender=ChatMessage.Sender.USER,
        created_at__gte=cutoff,
        session__user_identifier=user_identifier,
    ).count()
    if ip_burst_count >= IP_BURST_LIMIT:
        return RateLimitResult(
            reply=(
                "We are receiving too many requests from this connection. Please try again "
                "shortly or contact Finstar directly by phone, WhatsApp, or email."
            ),
            reason="burst_limit",
            retry_after_seconds=int(RATE_LIMIT_WINDOW.total_seconds()),
        )

    return None


def generate_chatbot_reply(session: ChatSession, user_message: str) -> ChatbotReply:
    detected_intent = detect_intent(user_message)
    matched_product_name, catalogue_context = build_catalogue_context(user_message)

    history = list(
        session.messages.order_by("-created_at").values("sender", "message")[:MAX_HISTORY_MESSAGES]
    )
    history.reverse()

    try:
        reply = generate_ai_reply(
            user_message=user_message,
            conversation_history=history,
            catalogue_context=catalogue_context,
            detected_intent=detected_intent,
        )
        status = ChatMessage.Status.NORMAL
    except OpenAIServiceError:
        reply = FALLBACK_RESPONSE
        status = ChatMessage.Status.FALLBACK

    return ChatbotReply(
        reply=finalize_reply(reply, detected_intent),
        status=status,
        detected_intent=detected_intent,
        matched_product_name=matched_product_name,
    )


def finalize_reply(reply: str, detected_intent: str) -> str:
    cleaned = reply.replace("```", "").replace("**", "")
    cleaned = re.sub(r"^\s*[>#*-]+\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()

    if detected_intent in QUOTE_INTENTS:
        lowered = cleaned.lower()
        if not any(term in lowered for term in ("quote", "whatsapp", "email", "contact", "phone")):
            cleaned = f"{cleaned}\n\n{QUOTE_FOLLOW_UP}".strip()

    return cleaned


def build_catalogue_context(user_message: str) -> tuple[str, str]:
    base_context = cache.get("chatbot:catalogue-base:v1")
    if base_context is None:
        categories = list(
            Category.objects.annotate(
                active_product_count=Count(
                    "products",
                    filter=Q(products__is_active=True),
                )
            )
            .order_by("name")
            .values("name", "description", "active_product_count")[:12]
        )
        featured_products = list(
            Product.objects.filter(is_active=True, featured=True)
            .select_related("category")
            .order_by("name")[:8]
            .values("name", "category__name", "short_description", "description")
        )
        if not featured_products:
            featured_products = list(
                Product.objects.filter(is_active=True)
                .select_related("category")
                .order_by("-created_at")[:8]
                .values("name", "category__name", "short_description", "description")
            )

        base_context = {
            "categories": categories,
            "featured_products": featured_products,
        }
        cache.set("chatbot:catalogue-base:v1", base_context, CATALOGUE_CACHE_TIMEOUT)

    relevant_products = find_relevant_products(user_message)
    matched_product_name = relevant_products[0]["name"] if relevant_products else ""

    category_lines = [
        f"- {item['name']}: {truncate(item['description'] or 'Industrial product category', 120)} "
        f"(active products: {item['active_product_count']})"
        for item in base_context["categories"]
    ]
    featured_lines = [format_product_line(item) for item in base_context["featured_products"][:5]]
    relevant_lines = [format_product_line(item) for item in relevant_products[:6]]

    context_parts = [
        "Categories:\n" + ("\n".join(category_lines) if category_lines else "- No categories available"),
        "Featured products:\n" + ("\n".join(featured_lines) if featured_lines else "- No featured products available"),
    ]

    if relevant_lines:
        context_parts.append("Relevant products for this request:\n" + "\n".join(relevant_lines))

    return matched_product_name, "\n\n".join(context_parts)


def find_relevant_products(user_message: str) -> list[dict[str, str]]:
    tokens = [
        token
        for token in re.findall(r"[a-z0-9][a-z0-9-]+", user_message.lower())
        if token not in STOP_WORDS and len(token) > 2
    ][:8]

    if not tokens:
        return []

    query = Q()
    for token in tokens:
        query |= Q(name__icontains=token)
        query |= Q(short_description__icontains=token)
        query |= Q(description__icontains=token)
        query |= Q(category__name__icontains=token)

    return list(
        Product.objects.filter(is_active=True)
        .select_related("category")
        .filter(query)
        .order_by("-featured", "name")[:6]
        .values("name", "category__name", "short_description", "description")
    )


def format_product_line(product: dict[str, str]) -> str:
    description = product["short_description"] or product["description"] or "No description available."
    return (
        f"- {product['name']} | category: {product['category__name']} | "
        f"{truncate(description, 150)}"
    )


def truncate(value: str, length: int) -> str:
    text = re.sub(r"\s+", " ", (value or "")).strip()
    if len(text) <= length:
        return text
    return text[: length - 1].rstrip() + "…"
